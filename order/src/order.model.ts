/* @file order.model.ts — Mongoose models for the Order service.
 * Defines the Order document with embedded subdocuments (items + address).
 *
 * Key lessons:
 * 1. EMBEDDING: items and the delivery address live INSIDE the order — no
 *    separate collections, no joins.
 * 2. _id: false — subdocuments are pure value objects; keeps the doc lean.
 * 3. ENUM = string allow-list enforced by MongoDB — must stay in sync with the
 *    Zod enum in order.dto.ts (Zod validates early, Mongo is the last guard).
 * 4. REFERENCES: userId/restaurantId point at objects in OTHER services' DBs
 *    by convention only — there are no foreign keys (database-per-service).
 */

import mongoose, { model, Schema } from "mongoose";
import type { Address, IOrder, OrderItem } from "./types/index.ts";

// * orderItemSchema — one basket line: product + name + price + quantity
// @snapshot price and name are COPIED in at creation, so future menu changes
// never rewrite order history (immutable history).
const orderItemSchema = new Schema<OrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  {
    _id: false,
  },
);

// * addressSchema — delivery point snapshotted into the order
// @snapshot Stored at order time so the courier always has the exact address,
// even if the user edits their profile later.
const addressSchema = new Schema<Address>(
  {
    title: { type: String },
    address: { type: String, required: true },
    city: { type: String, required: true },
    district: { type: String, required: true },
    postalCode: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false },
);

// @schema orderSchema — one document = one placed order
const orderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, required: true }, // @ref auth service user
    restaurantId: { type: Schema.Types.ObjectId, required: true }, // @ref restaurant service
    items: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 }, // @note computed server-side
    deliveryAddress: { type: addressSchema, required: true },
    paymentMethod: { type: String, required: true, enum: ["credit_card", "cash", "online"] },
    // @field status — the order state machine (must match dto + types enums):
    //   pending -> confirmed -> preparing -> ready -> on_the_way -> delivered / cancelled
    status: {
      type: String,
      required: true,
      enum: ["pending", "confirmed", "preparing", "ready", "on_the_way", "delivered", "cancelled"],
    },
    specialInstructions: { type: String },
  },
  {
    timestamps: true, // auto-manages createdAt + updatedAt
    toJSON: {
      // @note Friendly JSON shape: `_id` -> `id`, drop internal `_id`/`__v`.
      transform: function (doc: any, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  },
);

// @model Order — compiled model bound to the `orders` collection
export const Order = mongoose.model("Order", orderSchema);