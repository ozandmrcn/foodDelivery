import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { IJwtPayload } from "./types/index.ts";

const { JsonWebTokenError, TokenExpiredError } = jwt;

// JWT Token Authorization
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.substring(7);
    if (!accessToken) {
      res.status(401).json({
        status: "error",
        message: "Access token not found",
      });
      return;
    }
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET) as IJwtPayload;

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
