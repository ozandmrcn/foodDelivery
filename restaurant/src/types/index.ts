// ============================================================================
// 📌 RESTAURANT SERVICE — SHARED TYPE DEFINITIONS (types/index.ts)
// ============================================================================
// Restaurant + MenuItem types for this service, plus the copied user/order
// types used by the middleware/controller. See other services' type files for
// the "why is this duplicated" note (no shared package in this project).
//
// RESTAURANT-SPECIFIC LESSON:
// ---------------------------
// IRestaurant.ownerId is a VALUE reference (a String) to a user in the AUTH
// service's database — not a mongoose ObjectId ref, because it cannot be
// populated across service boundaries.
// ============================================================================

import { Document, Types } from "mongoose";

import type { NextFunction, Request, Response } from "express";

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

// Restaurant Types
// -----------------
// Opening hours: a simple weekday->string map.
export interface IOpeningHours {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

// The Restaurant document. ownerId is a value-ref to an auth user (no cross-
// service populate possible). categories/ingredients are plain string arrays.
export interface IRestaurant extends Document {
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  categories: string[];
  deliveryTime: number; // minutes
  minOrder: number; // minimum basket amount
  deliveryFee: number;
  rating?: number | undefined; // 0..5
  isActive: boolean;
  isOpen: boolean;
  openingHours: IOpeningHours;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

// One dish on a restaurant's menu. restaurantId is an ObjectId ref (populate
// works WITHIN this service's own database only).
export interface IMenuItem extends Document {
  restaurantId: Types.ObjectId;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  ingredients: string[];
  allergens: string[];
  isVegetarian: boolean;
  isAvailable: boolean;
  preparationTime: number;
  createdAt: Date;
  updatedAt: Date;
}
