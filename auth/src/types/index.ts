/* @file types/index.ts — Shared type definitions for the Auth service.
 * Central home for the interfaces used across model, service, middleware and
 * controller, avoiding re-declaration of the same shapes.
 *
 * @note Microservice lesson: these types are COPY-PASTED per service (order,
 *   delivery, restaurant each ship their own). There is no shared core package —
 *   that keeps every service independently buildable/deployable.
 */

import type { Request, Response, NextFunction } from "express";

// @typedef RouteParams — async Express handler signature used by catchAsync
export type RouteParams = (req: Request, res: Response, next: NextFunction) => Promise<any>;

// @interface IAddress — embedded subdocument shape (also declared in the model)
export interface IAddress {
  _id?: string;
  title: string;
  address: string;
  city: string;
  district: string;
  postalCode: number;
  isDefault: boolean;
}

// @typedef UserRole — the four roles; authorize() elsewhere checks against these
export type UserRole = "customer" | "restaurant_owner" | "courier" | "admin";

// @interface IUser — document shape. Extends Document, so instances expose
// _id, save(), comparePassword(), etc.
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

// @interface IJwtPayload — the data carved out of a verified JWT
export interface IJwtPayload {
  userId: string;
  role: UserRole;
  iat?: number; // "issued at" timestamp (auto-added by jwt.sign)
  exp?: number; // "expires at" timestamp (auto-added by jwt.sign)
}

// @interface IAuthResponse — standard success envelope from the auth service
export interface IAuthResponse {
  status: string;
  data: {
    user: { id: string; email: string; firstName: string; lastName: string; phone: string; role: UserRole };
    accessToken: string;
    refreshToken: string;
  };
}