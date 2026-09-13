// ============================================================================
// 📌 RESTAURANT SERVICE — AUTH MIDDLEWARE (restaurant.middleware.ts)
// ============================================================================
// Same pattern as order/delivery: verify the JWT, set req.user to the decoded
// payload { userId, role }, then authorize() applies the RBAC role check.
// Identical code is duplicated per service (no shared package). Full
// explanation lives in order.middleware.ts.
// ============================================================================

import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { IJwtPayload } from "./types/index.ts";

const { JsonWebTokenError, TokenExpiredError } = jwt;

// JWT Token Authorization
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Token from cookie or `Bearer xxxx` header.
    const accessToken = req.cookies.accessToken || req.headers.authorization?.substring(7);
    if (!accessToken) {
      res.status(401).json({
        status: "error",
        message: "Access token not found",
      });
      return;
    }
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET) as IJwtPayload;

    // Attach DECODED PAYLOAD only (userId + role), no DB lookup here.
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
// Higher-order function returning a role-checking middleware.
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
