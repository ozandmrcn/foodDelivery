// ============================================================================
// 📌 DELIVERY SERVICE — AUTH MIDDLEWARE (delivery.middleware.ts)
// ============================================================================
// IDENTICAL to the order service's middleware: verifies the JWT and attaches
// only the decoded payload { userId, role } to req.user — no DB call.
// `authorize` is the RBAC role guard. This file is copy-pasted because the
// delivery service runs as an independent deployable unit (no shared package).
// See order.middleware.ts for a full explanation of the pattern.
// ============================================================================

import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { IJwtPayload } from "./types/index.ts";

const { JsonWebTokenError, TokenExpiredError } = jwt;

// JWT Token Authorization
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Token from httpOnly cookie or the `Bearer xxxx` header (`substring(7)`
    // strips the leading "Bearer ").
    const accessToken = req.cookies.accessToken || req.headers.authorization?.substring(7);
    if (!accessToken) {
      res.status(401).json({
        status: "error",
        message: "Access token not found",
      });
      return;
    }
    // Verify signature + expiry. Throws -> handled in the catch block below.
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET) as IJwtPayload;

    // Attach the DECODED PAYLOAD (userId + role), not the full document.
    req.user = decoded;

    next();
  } catch (error) {
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
// Higher-order function: `authorize(["courier"])` RETURNS a middleware that
// runs the role check. Reads req.user.role set by authenticate.
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
