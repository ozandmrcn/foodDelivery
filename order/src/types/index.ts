/* @file types/index.ts — Shared type definitions for the Order service.
 * Copy-pasted (with differences) into every service — no shared package in
 * this project. That duplication is a trade-off: simple, but drift risk.
 *
 * @note OrderStatus / DeliveryStatus enums here MUST match the .enum([...])
 *   values in order.model.ts AND order.dto.ts.
 */

import type { Document } from "mongoose";
import type { NextFunction, Request, Response } from "express";
import type { Types } from "mongoose";

// @typedef RouteParams — async Express handler signature used by catchAsync
export type RouteParams = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export type UserRole = "customer" | "restaurant_owner" | "courier" | "admin";

export interface IAddress {
  _id?: string;
  title: string;
  address: string;
  city: string;
  district: string;
  postalCode: number;
  isDefault: boolean;
}

export interface IUser extends Document {
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
  comparePassword(candidatePassword: string): Promise<Boolean>;
}

// @interface IJwtPayload — what the middleware decodes from the JWT
export interface IJwtPayload {
  userId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// @typedef OrderStatus — order state machine (must match model + dto enums):
//   pending -> confirmed -> preparing -> ready -> on_the_way -> delivered / cancelled
export type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "on_the_way" | "delivered" | "cancelled";

// @interface OrderItem — one line in the basket/order
export interface OrderItem {
  productId: Types.ObjectId | string;
  name: string;
  price: number;
  quantity: number;
}

// @interface Address — delivery address embedded/snapshotted into the order
export interface Address {
  title?: string | undefined;
  address: string;
  city: string;
  district: string;
  postalCode: string;
  isDefault?: boolean | undefined;
}

// @interface IOrder — the order document (extends Document: _id, save(), etc.)
// @note userId/restaurantId refer to documents in OTHER services' databases
//   by convention — no foreign keys exist (database-per-service pattern).
export interface IOrder extends Document {
  userId: Types.ObjectId | string;
  restaurantId: Types.ObjectId | string;
  items: OrderItem[];
  totalAmount: number;
  deliveryAddress: Address;
  paymentMethod: "credit_card" | "cash" | "online";
  status: OrderStatus;
  specialInstructions?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}