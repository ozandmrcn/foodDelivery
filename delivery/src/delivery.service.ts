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

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (!this.initialized) {
      await rabbitmqService.initialize();
      this.initialized = true;
    }
  }

  async register(data: CourierRegisterInput) {
    await this.initialize();
    const hashedPassword = await bcrypt.hash(data.password, 12);

    const courier = await Courier.create({
      ...data,
      password: hashedPassword,
      role: "courier",
      status: "offline",
    });

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

  async login(data: CourierLoginInput) {
    const courier = await Courier.findOne({ email: data.email });

    if (!courier) {
      throw new Error("Invalid email or password");
    }

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

  async updateCourierStatus(courierId: string, data: CourierStatusUpdateInput) {
    const updatePayload: any = { status: data.status };
    if (data.location) {
      updatePayload.$push = { location: data.location };
    }

    const courier = await Courier.findByIdAndUpdate(courierId, updatePayload, { new: true });

    return {
      status: "success",
      data: { courier },
    };
  }

  async getAvailableOrders(courierId: string) {
    const deliveries = await DeliveryTracking.find({
      status: { $in: ["pending", "ready"] },
      courierId: { $exists: false },
    });

    return {
      status: "success",
      data: { deliveries },
    };
  }

  async acceptDelivery(orderId: string, courierId: string) {
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

  async updateDeliveryStatus(orderId: string, courierId: string, data: DeliveryStatusUpdateInput) {
    const delivery = await DeliveryTracking.findOneAndUpdate(
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

  async getCourierPerformance(courierId: string) {
    const deliveries = await DeliveryTracking.find({ courierId });

    const totalDeliveries = deliveries.length;
    const completedDeliveries = deliveries.filter((d) => d.status === "delivered").length;
    const avarageDeliveryTime =
      deliveries
        .filter((d) => d.actualDeliveryTime && d.acceptedAt)
        .reduce(
          (acc, d) =>
            acc + (new Date(d.actualDeliveryTime as Date).getTime() - new Date(d.acceptedAt as Date).getTime()),
          0,
        ) / (completedDeliveries || 1);

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
