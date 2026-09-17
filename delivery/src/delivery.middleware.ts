/* @file delivery.middleware.ts — JWT auth + RBAC middleware.
 * IDENTICAL to the order service's middleware: verifies the JWT and attaches
 * only the decoded payload { userId, role } — no DB call. Duplicated per
 * service on purpose: each service is an independent deployable unit.
 * @see order.middleware.ts for the full pattern explanation.
 */

import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { IJwtPayload } from "./types/index.ts";

const { JsonWebTokenError, TokenExpiredError } = jwt;

// @middleware authenticate — fills req.user with the decoded JWT payload
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Token from the httpOnly cookie or `Bearer xxxx` header (substring(7) strips "Bearer ").
    const accessToken = req.cookies.accessToken || req.headers.authorization?.substring(7);
    if (!accessToken) {
      res.status(401).json({
        status: "error",
        message: "Access token not found",
      });
      return;
    }
    // Verify signature + expiry (throws -> caught below).
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET) as IJwtPayload;

    // @note Attach only the DECODED payload, not the full document.
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

// @middleware authorize — RBAC role guard
/**
 * Higher-order function: returns a middleware checking req.user.role.
 * @param roles - Allowed roles, e.g. ["courier"]
 * @returns An Express middleware enforcing the role check
 */
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