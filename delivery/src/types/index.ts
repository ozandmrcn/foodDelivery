// ============================================================================
// 📌 DELIVERY SERVICE — SHARED TYPE DEFINITIONS (types/index.ts)
// ============================================================================
// Home for the delivery service's TypeScript types (Courier, DeliveryTracking,
// plus copied user/order types so the rabbitmq consumer can type the payloads
// it receives). See ordering service's types file for the duplication lesson.
//
// REMEMBER: the status strings below must match the DTO enums and the
// mongoose enums in delivery.model.ts.
// ============================================================================

import type { NextFunction, Request, Response } from "express";
import type { Document, Types } from "mongoose";

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

export interface IJwtPayload {
  userId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Teslimat — the delivery progress states (model + dto must match).
export type DeliveryStatus = "assigned" | "picked_up" | "in_transit" | "delivered" | "failed";

// A GPS point (note: "longtitude" mirrors the typo used in the models/schemas).
export interface ILocation {
  latitude: number;
  longtitude: number;
}

// The DeliveryTracking document: track ONE order's courier journey.
// orderId is a VALUE reference to the order service's document (no join).
export interface IDeliveryTracking extends Document {
  orderId: Types.ObjectId | string;
  courierId: Types.ObjectId | string;
  status: DeliveryStatus | "pending" | "ready"; // union: also accepts the
  // pre-courier states that arrive from rabbitmq events.
  location?: ILocation;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  notes?: string;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Kurye — a courier document.
export type CourierStatus = "available" | "busy" | "offline";

export interface ICourier extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  vehicleType: "motorcycle" | "bicycle" | "car";
  vehiclePlate?: string | undefined;
  status: CourierStatus;
  isAvailable: boolean;
  role: "courier" | "admin";
  location?: ILocation[] | undefined; // position history
  createdAt: Date;
  updatedAt: Date;
}

// Sipariş Tipleri — order payload types (copied so the rabbitmq consumer can
// parse the JSON messages published by the ORDER service).
export type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "on_the_way" | "delivered" | "cancelled";

export interface OrderItem {
  productId: Types.ObjectId | string;
  name: string;
  price: number;
  quantity: number;
}

export interface Address {
  title?: string;
  address: string;
  city: string;
  district: string;
  postalCode: string;
  isDefault?: boolean;
}

export interface IOrder extends Document {
  userId: Types.ObjectId | string;
  restaurantId: Types.ObjectId | string;
  items: OrderItem[];
  totalAmount: number;
  deliveryAddress: Address;
  paymentMethod: "credit_card" | "cash" | "online";
  status: OrderStatus;
  specialInstructions?: string;
  createdAt: Date;
  updatedAt: Date;
}
