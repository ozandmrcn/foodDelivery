// ============================================================================
// 📌 DELIVERY SERVICE — MONGOOSE MODELS (delivery.model.ts)
// ============================================================================
// Two collections live in the delivery service's OWN database:
//
// 1. Courier
//    - a delivery person (motorcycle/bicycle/car).
//    - `location` is an ARRAY of GPS points -> a moving history as the courier
//      updates their position. `status` = online/offline/busy availability.
//
// 2. DeliveryTracking
//    - ONE document per order that needs courier delivery.
//    - The link to the ORDER is just `orderId` (a value, NOT a mongoose ref):
//      the order document lives in the ORDER service's database (database-per-
//      service). The delivery service does not fetch the order; it receives
//      event payloads from rabbitmq that carry the needed fields.
//
// STATUS ENUMS (keep them in sync with delivery.dto.ts):
//   Courier status:  available | busy | offline
//   Delivery status: pending | ready | assigned | picked_up | in_transit |
//                    delivered | failed
// ============================================================================

import { model, Schema } from "mongoose";
import type { ICourier, IDeliveryTracking } from "./types/index.ts";

// location schema — a single GPS point (embedded in Courier + DeliveryTracking).
const locationSchema = new Schema(
  {
    latitude: { type: Number, required: true },
    longtitude: { type: Number, required: true }, // NB: "longtitude" is a typo,
    // but it's the field name used everywhere — changing it would be a breaking change.
  },
  {
    _id: false, // a bare GPS point needs no own identifier
  },
);

// schema
const courierSchema = new Schema<ICourier>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true }, // unique + indexed = fast, dup-free lookup at login
    password: { type: String, required: true }, // stored bcrypt-hashed (see service)
    phone: { type: String, required: true },
    vehicleType: { type: String, required: true, enum: ["motorcycle", "bicycle", "car"] },
    vehiclePlate: { type: String }, // optional taxi-like plate
    isAvailable: { type: Boolean, default: true },
    role: { type: String, required: true, enum: ["courier", "admin"] },
    status: { type: String, required: true, enum: ["available", "busy", "offline"] },
    location: [locationSchema], // ARRAY = position history, not just one point
  },
  {
    timestamps: true, // adds createdAt / updatedAt
    toJSON: {
      // Never expose the password through res.json(courier).
      // Friendly shape: `_id` -> `id`, drop `_id`, `__v`, `password`.
      transform: function (doc: any, ret: any) {
        ret.id = ret._id;
        delete ret.password;
        delete ret._id;
        delete ret.__v;
      },
    },
  },
);

// delivery tracking schema
const deliveryTrackingSchema = new Schema<IDeliveryTracking>(
  {
    orderId: { type: String, required: true }, // value reference to order service's document
    courierId: { type: String, required: false }, // filled when a courier claims the order
    status: {
      type: String,
      required: true,
      // The delivery lifecycle states. "pending"/"ready" arrive FROM RABBITMQ
      // events; "assigned"/... are the courier's progress updates.
      enum: ["pending", "ready", "assigned", "picked_up", "in_transit", "delivered", "failed"],
      default: "pending",
    },
    location: [locationSchema], // live position trail
    estimatedDeliveryTime: { type: Date },
    actualDeliveryTime: { type: Date },
    notes: { type: String }, // courier/restaurant messages ("customer at gate")
    acceptedAt: { type: Date }, // when the courier claimed the delivery
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc: any, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  },
);

// model — compile the schemas into mongoose models.
const Courier = model("Courier", courierSchema);
const DeliveryTracking = model("DeliveryTracking", deliveryTrackingSchema);
export { Courier, DeliveryTracking };
