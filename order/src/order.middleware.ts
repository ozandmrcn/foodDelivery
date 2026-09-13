// ============================================================================
// 📌 ORDER SERVICE — AUTH MIDDLEWARE (order.middleware.ts)
// ============================================================================
// This is the SAME middleware you saw in the auth service — with ONE key
// difference that is worth memorizing:
//
//   AUTH SERVICE:   req.user = full user document (fetched from the DB)
//   ORDER SERVICE:  req.user = only the decoded JWT payload { userId, role }
//
// WHY the difference? Because the order service does NOT own the users
// collection (that is auth service's database — database-per-service rule).
// It could still query the auth database via HTTP, but that would add a
// blocking network call to EVERY request. So this service trusts the JWT
// signature alone: if the signature verifies, the token was signed by a
// service that knows JWT_SECRET, hence valid. Faster, works offline, and the
// only real cost is that a revoked user stays "valid" until token expiry.
// ============================================================================

import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { IJwtPayload } from "./types/index.ts";

const { JsonWebTokenError, TokenExpiredError } = jwt;

// JWT Token Authorization
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Grab the token from the httpOnly cookie or the `Bearer` header.
    const accessToken = req.cookies.accessToken || req.headers.authorization?.substring(7);
    if (!accessToken) {
      res.status(401).json({
        status: "error",
        message: "Access token not found",
      });
      return;
    }
    // Verify signature + expiry. Throws -> caught below.
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET) as IJwtPayload;

    // NOT the full document, just the payload (see header note).
    req.user = decoded;

    next();
  } catch (error) {
    // Differentiate expired (-> client should refresh) vs invalid (-> log in again).
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

// Role Authorization Middleware
// ------------------------------
// `authorize(roles)` returns a NEW middleware that checks if req.user.role
// (set by authenticate) is in the allowed list. This is RBAC — Role Based
// Access Control, implemented in 10 lines.
// Example of HIGHER-ORDER FUNCTION: authorize returns a function (closure)
// that still sees `roles` through its outer scope.
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(403).json({
        status: "error",
        message: "Unauthorized",
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        status: "error",
        message: `Only ${roles.join(" or ")} role(s) can access this endpoint`,
      });
      return;
    }
    next();
  };
};
