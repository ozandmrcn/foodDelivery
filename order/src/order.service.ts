import type { OrderInput } from "./order.dto.ts";
import { Order } from "./order.model.ts";
import rabbitmqService from "./rabbitmq.service.ts";
import type { IOrder } from "./types/index.ts";

class OrderService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (!this.initialized) {
      await rabbitmqService.initialize();
      this.initialized = true;
    }
  }

  async createOrder(userId: string, orderData: OrderInput): Promise<IOrder> {
    // Start RabbitMQ connection
    await this.initialize();

    const totalAmount = orderData.items.reduce((total, item) => total + item.price * item.quantity, 0);

    const order = await Order.create({
      userId,
      restaurantId: orderData.restaurantId,
      items: orderData.items,
      totalAmount,
      deliveryAddress: orderData.deliveryAddress,
      paymentMethod: orderData.paymentMethod,
      specialInstructions: orderData.specialInstructions,
      status: "pending",
    });

    // Publish order created event
    await rabbitmqService.publishOrderCreated(order);

    return order;
  }

  async getOrderById(orderId: string) {
    return await Order.findById(orderId);
  }

  async getUserOrders(userId: string) {
    return await Order.find({ userId });
  }

  async updateOrderStatus(orderId: string, newStatus: string) {
    const order = await Order.findByIdAndUpdate(orderId, { status: newStatus }, { new: true });

    // Send order ready event to delivery service if order status is updated to "ready"
    if (order && newStatus === "ready") {
      await this.initialize();
      await rabbitmqService.publishOrderReady(order);
    }

    return order;
  }
}

export default new OrderService();
