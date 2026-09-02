import type { OrderInput } from "./order.dto.ts";
import { Order } from "./order.model.ts";
import type { IOrder } from "./types/index.ts";

class OrderService {
  constructor() {}

  async createOrder(userId: string, orderData: OrderInput): Promise<IOrder> {
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

    if (order && newStatus === "ready") {
      // send notification to delivery service
    }

    return order;
  }
}

export default new OrderService();
