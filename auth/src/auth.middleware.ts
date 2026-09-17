/* @file auth.middleware.ts — JWT authentication middleware.
 * Runs between request arrival and the route handler: it verifies the token,
 * loads the user, and attaches the full document to `req.user`.
 */

import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { IJwtPayload } from "./types/index.ts";
import User from "./auth.model.ts";

const { JsonWebTokenError, TokenExpiredError } = jwt;

// @middleware authenticate — protects any route it is attached to
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 1. Extract the token: prefer an explicit `Authorization: Bearer <token>`
    //    header over the ambient httpOnly cookie. substring(7) strips "Bearer ".
    const accessToken = req.headers.authorization?.substring(7) || req.cookies.accessToken;
    if (!accessToken) {
      res.status(401).json({
        status: "error",
        message: "Access token not found",
      });
      return;
    }
    // 2. Verify signature + expiration (throws if tampered or expired).
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

    // 4. Attach the FULL document to req.user so controllers can use it.
    req.user = user;
    next();
  } catch (error) {
    // Differentiate token failures so the client knows whether to refresh
    // (expired) or log in again (invalid/tampered).
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