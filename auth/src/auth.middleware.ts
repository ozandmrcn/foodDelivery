// ============================================================================
// 📌 AUTH SERVICE — AUTHENTICATION MIDDLEWARE (auth.middleware.ts)
// ============================================================================
// WHAT IS MIDDLEWARE?
// -------------------
// A function that runs BETWEEN the request arriving and the route handler.
// It can inspect/modify the request, stop it (send a response), or call next()
// to pass control to the next middleware/route in the chain.
//
// WHAT DOES `authenticate` DO?
// ----------------------------
// 1. Reads the JWT from the cookie OR the Authorization: Bearer <token> header.
// 2. Verifies the signature + expiry with jwt.verify().
// 3. Loads the user from the DB and attaches it to req.user.
// 4. Calls next() so protected routes can run.
//
// REMEMBER THE DIFFERENCE between this service and the others:
//   - HERE (auth):    req.user = full user document from the database.
//   - order/delivery/restaurant: req.user = just the decoded token payload
//     ({ userId, role }) and NO DB call. Why? Those services trust the JWT
//     and only need the id/role; hitting the DB on every request would be slow.
//     This is a design trade-off, not a bug.
// ============================================================================

import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { IJwtPayload } from "./types/index.ts";
import User from "./auth.model.ts";

const { JsonWebTokenError, TokenExpiredError } = jwt;

// JWT Token Authorization
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 1. Extract the token. Prefer the httpOnly cookie; fall back to the
    //    `Authorization: Bearer xxx` header. `.substring(7)` strips "Bearer ".
    const accessToken = req.cookies.accessToken || req.headers.authorization?.substring(7);
    if (!accessToken) {
      res.status(401).json({
        status: "error",
        message: "Access token not found",
      });
      return;
    }
    // 2. Verify signature AND expiration. Throws if tampered/expired.
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET) as IJwtPayload;

    // 3. Fetch the user to confirm it still exists and is active.
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      res.status(401).json({
        status: "error",
        message: "Invalid token or user inactive",
      });
      return;
    }

    // 4. Attach user to the request so controllers can access req.user.
    req.user = user;
    next();
  } catch (error) {
    // Differentiate the two most common JWT failures so the client knows if
    // it should refresh the token (expired) or log in again (invalid).
    if (error instanceof TokenExpiredError) {
      res.status(401).json({
        status: "error",
        message: "Token expired",
      });
      return;
    } else if (error instanceof JsonWebTokenError) {
      res.status(401).json({
        status: "error",
        message: "Invalid token",
      });
      return;
    } else {
      res.status(401).json({
        status: "error",
        message: "Token verification failed",
      });
      return;
    }
  }
};
