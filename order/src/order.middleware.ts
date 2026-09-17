/* @file order.middleware.ts — JWT auth + RBAC middleware.
 * Same idea as the auth service middleware with ONE key difference:
 *   AUTH SERVICE:  req.user = full user document (DB lookup)
 *   ORDER SERVICE: req.user = decoded JWT payload only { userId, role }
 *
 * @note Why no DB lookup here? The users collection belongs to the auth
 *   service (database-per-service). Querying it over HTTP on every request
 *   would add a blocking network call. Trusting the JWT signature alone is
 *   faster and offline — the trade-off: a revoked user stays "valid" until
 *   their token expires.
 */

import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { IJwtPayload } from "./types/index.ts";

const { JsonWebTokenError, TokenExpiredError } = jwt;

// @middleware authenticate — verifies the token, fills req.user with the payload
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Grab the token from the `Bearer` header first — an explicit token always
    // wins over the ambient httpOnly cookie.
    const accessToken = req.headers.authorization?.substring(7) || req.cookies.accessToken;
    if (!accessToken) {
      res.status(401).json({
        status: "error",
        message: "Access token not found",
      });
      return;
    }
    // Verify signature + expiry (throws -> caught below).
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET) as IJwtPayload;

    // Just the payload — NOT the full document (see file header note).
    req.user = decoded;

    next();
  } catch (error) {
    // Distinguish "refresh it" (expired) from "log in again" (invalid).
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

// @middleware authorize — RBAC in ~10 lines
/**
 * Higher-order function: returns a middleware that checks req.user.role
 * against the allowed list (closure keeps `roles` visible to the returned fn).
 * @param roles - Allowed roles, e.g. ["admin", "restaurant_owner"]
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