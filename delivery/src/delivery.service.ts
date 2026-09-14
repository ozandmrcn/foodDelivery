// ============================================================================
// 📌 DELIVERY SERVICE — BUSINESS LOGIC LAYER (delivery.service.ts)
// ============================================================================
// Manages two "actors" of the delivery world:
//   1. COURIER: register / login / status update / performance stats
//   2. DELIVERY TRACKING: available orders, accept delivery, update status, track
//
// SECURITY NOTE — PASSWORD & JWT:
// -------------------------------
// The courier's password is hashed with bcrypt here (and compared with
// bcrypt.compare). The JWT is signed with the SAME JWT_SECRET as the auth
// service, so a courier token can be verified by the order/restaurant services
// too. Clever side effect of shared secrets: one token works across services.
//
// RACE-CONDITION PROTECTION (delivery claiming):
// ----------------------------------------------
// In `acceptDelivery`, the query is GUARDED:
//   { orderId, courierId: { $exists: false } }
// "Update this delivery ONLY IF it does not yet have a courier". MongoDB does
// the check-and-set ATOMICALLY, so if two couriers simultaneously accept the
// same order, exactly ONE succeeds. This is how microservices handle
// concurrent updates without locks.
// ============================================================================

import type {
  CourierLoginInput,
  CourierPerformanceInput,
  CourierRegisterInput,
  CourierStatusUpdateInput,
  DeliveryStatusUpdateInput,
} from "./delivery.dto.ts";
import bcrypt from "bcrypt";
import { Courier, DeliveryTracking } from "./delivery.model.ts";
import jwt from "jsonwebtoken";
import rabbitmqService from "./rabbitmq.service.ts";

class AuthService {
  private initialized = false;

  // listen to rabbitmq
  // ⭐ NOTE: this constructor is called at import time -> the service STARTS
  // listening to the delivery queue as soon as the process boots, before any
  // HTTP request arrives. That is the whole point of the consumer pattern:
  // it is always "on" so events are never missed.
  constructor() {
    this.initialize();
  }

  // Lazy-once initialization guard (see order service for the same pattern).
  private async initialize() {
    if (!this.initialized) {
      await rabbitmqService.initialize();
      this.initialized = true;
    }
  }

  // -------------------------------------------------------
  // COURIER REGISTRATION
  // -------------------------------------------------------
  async register(data: CourierRegisterInput) {
    await this.initialize();
    // bcrypt.hash(password, 12) — same "salt rounds" technique as auth service.
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // `vehiclePlate` is optional -> spread it only when actually provided,
    // otherwise exactOptionalPropertyTypes rejects the `undefined` value.
    const { vehiclePlate, ...rest } = data;

    const courier = await Courier.create({
      ...rest,
      ...(vehiclePlate !== undefined && { vehiclePlate }),
      password: hashedPassword,
      role: "courier", // FORCED: registration can never assign admin!
      status: "offline", // starts offline; courier must set "available"
    });

    // Return a JWT right away so the courier is logged-in after registering.
    const token = jwt.sign({ userId: courier.id, role: courier.role }, process.env.JWT_SECRET as string, {
      expiresIn: "24h",
    });

    return {
      status: "success",
      data: {
        courier,
        token,
      },
    };
  }

  // -------------------------------------------------------
  // COURIER LOGIN
  // -------------------------------------------------------
  async login(data: CourierLoginInput) {
    const courier = await Courier.findOne({ email: data.email });

    if (!courier) {
      throw new Error("Invalid email or password");
    }

    // bcrypt.compare: hash the attempt, compare against stored hash.
    const isPasswordValid = await bcrypt.compare(data.password, courier.password);

    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    const token = jwt.sign({ userId: courier.id, role: courier.role }, process.env.JWT_SECRET as string, {
      expiresIn: "24h",
    });

    return {
      status: "success",
      data: {
        courier,
        token,
      },
    };
  }

  // -------------------------------------------------------
  // UPDATE COURIER STATUS (available / busy / offline)
  // -------------------------------------------------------
  async updateCourierStatus(courierId: string, data: CourierStatusUpdateInput) {
    const updatePayload: any = { status: data.status };
    // Mongoose `$push` operator appends to an ARRAY field. The courier's
    // location becomes a HISTORY — every status update can append a new GPS
    // point, perfect for tracking the live position later.
    if (data.location) {
      updatePayload.$push = { location: data.location };
    }

    const courier = await Courier.findByIdAndUpdate(courierId, updatePayload, { new: true });

    return {
      status: "success",
      data: { courier },
    };
  }

  // -------------------------------------------------------
  // AVAILABLE ORDERS FOR COURIERS
  // -------------------------------------------------------
  async getAvailableOrders(courierId: string) {
    // Find deliveries that are awaiting a courier:
    //   - status is pending or ready (not yet claimed)
    //   - courierId does not exist yet (still unclaimed)
    const deliveries = await DeliveryTracking.find({
      status: { $in: ["pending", "ready"] },
      courierId: { $exists: false },
    });

    return {
      status: "success",
      data: { deliveries },
    };
  }

  // -------------------------------------------------------
  // COURIER ACCEPTS AN ORDER
  // -------------------------------------------------------
  async acceptDelivery(orderId: string, courierId: string) {
    // ⭐ ATOMIC CLAIM — see the race-condition note in the file header.
    // `{ courierId: { $exists: false } }` guarantees only the FIRST courier
    // wins. If another courier just claimed it, this update matches nothing
    // and returns null.
    const delivery = await DeliveryTracking.findOneAndUpdate(
      { orderId, courierId: { $exists: false } }, // ensures the order is not already accepted (by another courier)
      { courierId, status: "assigned" },
      { new: true },
    );

    return {
      status: "success",
      data: {
        delivery,
      },
    };
  }

  // -------------------------------------------------------
  // COURIER UPDATES DELIVERY PROGRESS
  // -------------------------------------------------------
  async updateDeliveryStatus(orderId: string, courierId: string, data: DeliveryStatusUpdateInput) {
    const delivery = await DeliveryTracking.findOneAndUpdate(
      // Only the courier ASSIGNED to this order can update it.
      { orderId, courierId },
      {
        status: data.status,
        location: data.location,
        estimatedDeliveryTime: data.estimatedArrival,
        actualDeliveryTime: data.actualArrival,
        notes: data.notes,
      },
    );
    return {
      status: "success",
      data: delivery,
    };
  }

  // -------------------------------------------------------
  // TRACKING ENDPOINT (read-only for the CUSTOMER)
  // -------------------------------------------------------
  async trackDelivery(orderId: string) {
    const delivery = await DeliveryTracking.findOne({ orderId });

    if (!delivery) {
      throw new Error("Delivery not found");
    }

    return {
      status: "success",
      data: delivery,
    };
  }

  // -------------------------------------------------------
  // COURIER PERFORMANCE METRICS (for the admin dashboard)
  // -------------------------------------------------------
  async getCourierPerformance(courierId: string) {
    const deliveries = await DeliveryTracking.find({ courierId });

    const totalDeliveries = deliveries.length;
    const completedDeliveries = deliveries.filter((d) => d.status === "delivered").length;

    // Average delivery time = mean of (actualDeliveryTime - acceptedAt),
    // computed only for deliveries that have both timestamps.
    //  ms difference -> minutes with (1000 * 60).
    const avarageDeliveryTime =
      deliveries
        .filter((d) => d.actualDeliveryTime && d.acceptedAt)
        .reduce(
          (acc, d) =>
            acc + (new Date(d.actualDeliveryTime as Date).getTime() - new Date(d.acceptedAt as Date).getTime()),
          0,
        ) / (completedDeliveries || 1); // (|| 1) avoids division by zero

    const avarageDeliveryTimeInMinutes = Math.round(avarageDeliveryTime / (1000 * 60));

    return {
      status: "success",
      data: {
        totalDeliveries,
        completedDeliveries,
        avarageDeliveryTime,
        completionRate: totalDeliveries > 0 ? Math.round((completedDeliveries / totalDeliveries) * 100) : 0,
      },
    };
  }
}

export default new AuthService();
