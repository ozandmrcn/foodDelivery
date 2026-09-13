// ============================================================================
// 📌 AUTH SERVICE — SHARED TYPE DEFINITIONS (types/index.ts)
// ============================================================================
// WHAT IS THIS FILE?
// ------------------
// A central home for TypeScript interfaces/types used across the auth service
// (model, service, middleware, controller). This avoids re-declaring shapes.
//
// IMPORTANT MICROSERVICE LESSON:
// ------------------------------
// These types are COPY-PASTED into every service (order/delivery/restaurant
// each have their own types/index.ts). There is NO shared "core" package here.
// In a bigger project you would extract shared types into a published npm
// package or a monorepo package — but for learning, duplicating is the point:
// each service is fully independent and can be built/deployed on its own.
// ============================================================================

import type { Request, Response, NextFunction } from "express";

// Type used by catchAsync: an async Express handler that returns a Promise.
export type RouteParams = (req: Request, res: Response, next: NextFunction) => Promise<any>;

// Embedded address shape (also declared as a mongoose subdoc in the model).
export interface IAddress {
  _id?: string;
  title: string;
  address: string;
  city: string;
  district: string;
  postalCode: number;
  isDefault: boolean;
}

// The possible roles a user can have. Influences which routes are allowed
// (see authorize middleware in other services).
export type UserRole = "customer" | "restaurant_owner" | "courier" | "admin";

// Document shape for a User. NOTE: extends `Document` -> mongoose document,
// so instances have _id, save(), comparePassword(), etc.
export interface IUser extends Document {
  _id?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  addresses: IAddress[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword: (candidatePassword: string) => Promise<boolean>;
}

// The data carved out of the JWT after verification.
export interface IJwtPayload {
  userId: string;
  role: UserRole;
  iat?: number; // "issued at" timestamp (auto-added by jwt.sign)
  exp?: number; // "expires at" timestamp (auto-added by jwt.sign)
}

// Standard happy-path success response shape used by the auth service.
export interface IAuthResponse {
  status: string;
  data: {
    user: { id: string; email: string; firstName: string; lastName: string; phone: string; role: UserRole };
    accessToken: string;
    refreshToken: string;
  };
}
