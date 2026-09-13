// ============================================================================
// 📌 ORDER SERVICE — MONGOOSE MODELS (order.model.ts)
// ============================================================================
// Defines the shape of an Order document. KEY LESSONS:
//
// 1. EMBEDDED SCHEMAS: `orderItemSchema` and `addressSchema` are embedded
//    inside the order (subdocuments). No separate "items" collection needed.
//
// 2. `_id: false`: order items and address have NO own _id — they are pure
//    value objects inside the order. Setting `_id: false` keeps the document
//    smaller and cleaner.
//
// 3. ENUM = nothing more than a STRING allowed-list enforced by MongoDB.
//    If someone tries to save status "created" (not in the enum), Mongo throws.
//    Keep these enum values IN SYNC with the Zod enum in order.dto.ts — the
//    Zod layer validates early (nice error), the Mongo enum is the last guard.
//
// 4. REFERENCES vs EMBEDDING:
//    - userId / restaurantId are stored as ObjectId REFERENCES to documents
//      that live in OTHER services' databases (auth service, restaurant
//      service). There is NO foreign-key enforcement; the ref is by convention.
//      This is sameness the "database per service" pattern produces.
// ============================================================================

import mongoose, { model, Schema } from "mongoose";
import type { Address, IOrder, OrderItem } from "./types/index.ts";

// order item type
// A single line in the order: what product, how many, at what unit price.
// NOTE: price + name are COPIED into the order at creation time, so future
// menu price changes don't rewrite the order history (immutable snapshot).
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

// order delivery address type
// The address is also snapshotted here (not fetched later) — the delivery
// courier needs exactly this point, even if the user changes their address.
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

// order model
const orderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, required: true }, // ref to auth service user
    restaurantId: { type: Schema.Types.ObjectId, required: true }, // ref to restaurant service restaurant
    items: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 }, // computed server-side
    deliveryAddress: { type: addressSchema, required: true },
    paymentMethod: { type: String, required: true, enum: ["credit_card", "cash", "online"] },
    // ⭐ THE ORDER STATE MACHINE — every valid state, in the life cycle
    //   pending -> confirmed -> preparing -> ready -> on_the_way -> delivered
    status: {
      type: String,
      required: true,
      enum: ["pending", "confirmed", "preparing", "ready", "on_the_way", "delivered", "cancelled"],
    },
    specialInstructions: { type: String },
  },
  {
    timestamps: true, // auto createdAt + updatedAt
    toJSON: {
      // Friendly JSON shape: `_id` -> `id`, drop internal fields (`_id`,`__v`).
      transform: function (doc: any, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  },
);

// model
export const Order = mongoose.model("Order", orderSchema);
