// ============================================================================
// 📌 ORDER SERVICE — SHARED TYPE DEFINITIONS (types/index.ts)
// ============================================================================
// Central home for the order service's TypeScript types.
// This file is COPY-PASTED (with small differences) into the other services —
// there is no shared package in this learning project. That duplication is a
// real-world trade-off: simpler here, but drift risk (they can get out of sync).
//
// KEY LINK: the `OrderStatus`, `DeliveryStatus` enum strings here must match
// the `.enum([...])` values in order.model.ts AND order.dto.ts.
// ============================================================================

import type { Document } from "mongoose";
import type { NextFunction, Request, Response } from "express";
import type { Types } from "mongoose";

// Type used by catchAsync: an async Express handler returning a Promise.
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

// What the middleware decodes from the JWT and stores on req.user.
export interface IJwtPayload {
  userId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Sipariş Tipleri — the order state machine (must match model + dto enums):
//   pending -> confirmed -> preparing -> ready -> on_the_way -> delivered / cancelled
export type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "on_the_way" | "delivered" | "cancelled";

// One line in the basket/order.
export interface OrderItem {
  productId: Types.ObjectId | string;
  name: string;
  price: number;
  quantity: number;
}

// Delivery address embedded/snapshotted into the order.
export interface Address {
  title?: string | undefined;
  address: string;
  city: string;
  district: string;
  postalCode: string;
  isDefault?: boolean | undefined;
}

// The Order DOCUMENT: extends mongoose Document, so an instance has _id,
// save(), populate(), etc. Note userId/restaurantId refer to documents in
// OTHER services' databases (by convention, no foreign key).
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
