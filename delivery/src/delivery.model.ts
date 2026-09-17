/* @file delivery.model.ts — Mongoose models of the Delivery service.
 * Two collections in this service's own database:
 *   1. Courier — a delivery person; `location` is an ARRAY of GPS points =
 *      a moving position history; `status` = availability.
 *   2. DeliveryTracking — ONE document per order needing courier delivery.
 *      `orderId` is a VALUE reference (not a mongoose ref): the order itself
 *      lives in the order service's DB. Payloads arrive via RabbitMQ events.
 *
 * Status enums (keep in sync with delivery.dto.ts):
 *   Courier status:  available | busy | offline
 *   Delivery status: pending | ready | assigned | picked_up | in_transit |
 *                    delivered | failed
 */

import { model, Schema } from "mongoose";
import type { ICourier, IDeliveryTracking } from "./types/index.ts";

// @embed locationSchema — a single GPS point (used by both collections)
const locationSchema = new Schema(
  {
    latitude: { type: Number, required: true },
    longtitude: { type: Number, required: true }, // @note "longtitude" is a typo
    // but it is the agreed field name everywhere — renaming would be breaking.
  },
  {
    _id: false, // a bare GPS point needs no own identifier
  },
);

// @schema courierSchema — one document = one delivery person
const courierSchema = new Schema<ICourier>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true }, // unique+indexed: fast, dup-free login lookup
    password: { type: String, required: true }, // @note stored bcrypt-hashed (see service)
    phone: { type: String, required: true },
    vehicleType: { type: String, required: true, enum: ["motorcycle", "bicycle", "car"] },
    vehiclePlate: { type: String }, // @field optional taxi-like plate
    isAvailable: { type: Boolean, default: true },
    role: { type: String, required: true, enum: ["courier", "admin"] },
    status: { type: String, required: true, enum: ["available", "busy", "offline"] },
    location: [locationSchema], // @note ARRAY = position history, not one point
  },
  {
    timestamps: true, // auto-manages createdAt / updatedAt
    toJSON: {
      // ! Never expose the password through res.json(courier).
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

// @schema deliveryTrackingSchema — one document per deliverable order
const deliveryTrackingSchema = new Schema<IDeliveryTracking>(
  {
    orderId: { type: String, required: true }, // @value-ref order in order service DB
    courierId: { type: String, required: false }, // filled when a courier claims it
    status: {
      type: String,
      required: true,
      // @note "pending"/"ready" arrive FROM RABBITMQ events; assigned/... are
      //   the courier's own progress updates.
      enum: ["pending", "ready", "assigned", "picked_up", "in_transit", "delivered", "failed"],
      default: "pending",
    },
    location: [locationSchema], // @field live position trail
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

// @model Compile schemas into mongoose models.
const Courier = model("Courier", courierSchema);
const DeliveryTracking = model("DeliveryTracking", deliveryTrackingSchema);
export { Courier, DeliveryTracking };