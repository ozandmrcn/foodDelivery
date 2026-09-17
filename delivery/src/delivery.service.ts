/* @file delivery.service.ts — Business logic layer of the Delivery service.
 * Manages two actors:
 *   1. COURIER — register / login / status update / performance stats
 *   2. DELIVERY TRACKING — available orders, accept delivery, status, tracking
 *
 * @note Shared-secret trick: courier tokens are signed with the SAME JWT_SECRET
 *   as the auth service, so one token verifies across all services.
 */

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

  // @note Constructor runs at import time -> the consumer starts listening as
  //   soon as the process boots, before any HTTP request. That is the whole
  //   point of the consumer pattern: always "on", so events are never missed.
  constructor() {
    this.initialize();
  }

  // @singleton Lazy-once init guard (same pattern as the order service).
  private async initialize() {
    if (!this.initialized) {
      await rabbitmqService.initialize();
      this.initialized = true;
    }
  }

  // * COURIER REGISTRATION
  /**
   * Register a courier and return their JWT immediately (auto-login).
   * @param data - Validated register input (Zod DTO)
   * @returns Courier document + a 24h token
   */
  async register(data: CourierRegisterInput) {
    await this.initialize();
    // @note Same bcrypt salt-rounds technique as the auth service.
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // @note vehiclePlate is optional — spread it only when provided, otherwise
    //   exactOptionalPropertyTypes rejects the undefined value.
    const { vehiclePlate, ...rest } = data;

    const courier = await Courier.create({
      ...rest,
      ...(vehiclePlate !== undefined && { vehiclePlate }),
      password: hashedPassword,
      role: "courier", // ! FORCED: registration can never grant another role
      status: "offline", // @note courier must opt in to "available"
    });

    // Auto-login: issue the token right after registering.
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

  // * COURIER LOGIN
  /**
   * Login a courier.
   * @param data - Validated login input (Zod DTO)
   * @returns Courier document + a 24h token
   * @throws {Error} "Invalid email or password" for both failures (no enumeration)
   */
  async login(data: CourierLoginInput) {
    const courier = await Courier.findOne({ email: data.email });

    if (!courier) {
      throw new Error("Invalid email or password");
    }

    // bcrypt.compare: hash the attempt, compare with the stored hash.
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

  // * UPDATE COURIER STATUS (available / busy / offline)
  /**
   * Update courier availability, optionally appending a GPS point.
   * @param courierId - Target courier id (from the verified JWT)
   * @param data - Status (+ optional location)
   * @returns Updated courier document
   */
  async updateCourierStatus(courierId: string, data: CourierStatusUpdateInput) {
    const updatePayload: any = { status: data.status };
    // @note $push appends to an ARRAY — location becomes a HISTORY of GPS
    //   points, ready for live position tracking later.
    if (data.location) {
      updatePayload.$push = { location: data.location };
    }

    const courier = await Courier.findByIdAndUpdate(courierId, updatePayload, { new: true });

    return {
      status: "success",
      data: { courier },
    };
  }

  // * AVAILABLE ORDERS FOR COURIERS
  /**
   * List deliveries still waiting for a courier.
   * @returns Deliveries with status pending/ready and courierId null
   */
  async getAvailableOrders() {
    const deliveries = await DeliveryTracking.find({
      status: { $in: ["pending", "ready"] },
      courierId: null, // not yet claimed
    });

    return {
      status: "success",
      data: { deliveries },
    };
  }

  // * COURIER ACCEPTS AN ORDER
  /**
   * Atomically claim a delivery for a courier.
   * @param orderId - The delivery's order id
   * @param courierId - The claiming courier
   * @returns Updated delivery document (null if already claimed)
   * @note RACE-CONDITION GUARD: the filter { courierId: null } makes MongoDB
   *   check-and-set ATOMICALLY — if two couriers accept the same order at once,
   *   exactly one wins; the other's update matches nothing and returns null.
   */
  async acceptDelivery(orderId: string, courierId: string) {
    const delivery = await DeliveryTracking.findOneAndUpdate(
      { orderId, courierId: null }, // ensures the order is not already accepted
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

  // * COURIER UPDATES DELIVERY PROGRESS
  /**
   * Advance a delivery's status (courier-owned).
   * @param orderId - The delivery's order id
   * @param courierId - The assigned courier (from the verified JWT)
   * @param data - Status + timestamps + location + notes
   * @throws {Error} If the delivery is not found or NOT assigned to this courier
   */
  async updateDeliveryStatus(orderId: string, courierId: string, data: DeliveryStatusUpdateInput) {
    const delivery = await DeliveryTracking.findOneAndUpdate(
      // Only the courier ASSIGNED to this order can update it.
      { orderId, courierId },
      {
        status: data.status,
        ...(data.location && { location: data.location }),
        // @note estimatedArrival arrives in MINUTES (e.g. 15) but the field is a
        //   Date — convert to an absolute future timestamp, never a raw number.
        ...(data.estimatedArrival !== undefined && {
          estimatedDeliveryTime: new Date(Date.now() + data.estimatedArrival * 60 * 1000),
        }),
        ...(data.actualArrival && { actualDeliveryTime: data.actualArrival }),
        ...(data.notes && { notes: data.notes }),
      },
      { new: true },
    );

    if (!delivery) {
      throw new Error("Delivery not found or you are not assigned to this order");
    }

    return {
      status: "success",
      data: delivery,
    };
  }

  // * TRACKING ENDPOINT (read-only for the CUSTOMER)
  /**
   * Fetch one delivery for customer tracking.
   * @param orderId - The order id being tracked
   * @throws {Error} If no delivery matches
   */
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

  // * COURIER PERFORMANCE METRICS (admin dashboard)
  /**
   * Aggregate a courier's delivery stats.
   * @param courierId - The courier to measure
   * @returns Totals: deliveries, completed, avg time (minutes), completion rate
   */
  async getCourierPerformance(courierId: string) {
    const deliveries = await DeliveryTracking.find({ courierId });

    const totalDeliveries = deliveries.length;
    const completedDeliveries = deliveries.filter((d) => d.status === "delivered").length;

    // @note Average delivery time = mean of (actualDeliveryTime - acceptedAt)
    //   for deliveries that have both timestamps. ms -> minutes via (1000 * 60).
    const avarageDeliveryTime =
      deliveries
        .filter((d) => d.actualDeliveryTime && d.acceptedAt)
        .reduce(
          (acc, d) =>
            acc + (new Date(d.actualDeliveryTime as Date).getTime() - new Date(d.acceptedAt as Date).getTime()),
          0,
        ) / (completedDeliveries || 1); // @note (|| 1) avoids division by zero

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