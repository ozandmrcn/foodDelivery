/* @file order.service.ts — Business logic layer of the Order service.
 * Owns order creation (with server-side total), reads, and status updates.
 * When an order becomes "ready" it hands off to delivery via RabbitMQ —
 * no direct call between services.
 *
 * Order lifecycle (state machine):
 *   pending -> confirmed -> preparing -> ready -> on_the_way -> delivered
 *                               \-> cancelled (any time)
 * The order service owns states up to "ready"; beyond that is delivery's flow.
 */

import type { OrderInput } from "./order.dto.ts";
import { Order } from "./order.model.ts";
import rabbitmqService from "./rabbitmq.service.ts";
import type { IOrder } from "./types/index.ts";

class OrderService {
  // @singleton Lazy-init flag: RabbitMQ connection is created exactly once.
  private initialized = false;

  /**
   * Ensure RabbitMQ is connected before first use (cheap no-op afterwards).
   */
  async initialize(): Promise<void> {
    if (!this.initialized) {
      await rabbitmqService.initialize();
      this.initialized = true;
    }
  }

  // * createOrder()
  /**
   * Persist an order and publish the order.created event.
   * @param userId - Owner id taken from the verified JWT (never from the body)
   * @param orderData - Validated order input (Zod DTO)
   * @returns The created order document
   * @throws {Error} On Zod validation failure (from the controller layer)
   */
  async createOrder(userId: string, orderData: OrderInput): Promise<IOrder> {
    // Make sure the bus is ready before we publish.
    await this.initialize();

    // ! NEVER trust a client-supplied totalAmount — recompute it server-side.
    const totalAmount = orderData.items.reduce((total, item) => total + item.price * item.quantity, 0);

    // Persist; status always starts at "pending" (initial state machine state).
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

    // @broker Publish order.created -> delivery service reacts on delivery_queue.
    await rabbitmqService.publishOrderCreated(order);

    return order;
  }

  // * READ: single order by mongodb _id
  async getOrderById(orderId: string) {
    return await Order.findById(orderId);
  }

  // * READ: all orders belonging to one user
  async getUserOrders(userId: string) {
    return await Order.find({ userId });
  }

  // * updateOrderStatus()
  /**
   * Advance the order state machine.
   * @param orderId - Target order id
   * @param newStatus - Next state (validated against the enum by the controller)
   * @returns The updated order document
   * @note The SPECIAL case: reaching "ready" emits the order.ready event so the
   *   delivery service knows a courier can pick the order up.
   */
  async updateOrderStatus(orderId: string, newStatus: string) {
    // @note { new: true } returns the POST-update document.
    const order = await Order.findByIdAndUpdate(orderId, { status: newStatus }, { new: true });

    // @broker Hand-off event when the order becomes ready for pickup.
    if (order && newStatus === "ready") {
      await this.initialize();
      await rabbitmqService.publishOrderReady(order);
    }

    return order;
  }
}

// @singleton One shared instance for the whole service.
export default new OrderService();