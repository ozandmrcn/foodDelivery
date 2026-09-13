// ============================================================================
// 📌 ORDER SERVICE — BUSINESS LOGIC LAYER (order.service.ts)
// ============================================================================
// WHAT DOES THIS SERVICE DO?
// --------------------------
// The "brain" of order management:
//   - createOrder():   validate + compute total + save order + PUBLISH event
//   - getOrderById():  read a single order
//   - getUserOrders(): list orders of a user
//   - updateOrderStatus(): change status; if "ready" -> PUBLISH event
//
// THE ORDER LIFECYCLE (finite state machine seen across the system):
// -------------------------------------------------------------
//   pending -> confirmed -> preparing -> ready -> on_the_way -> delivered
//                                    \-> cancelled (any time)
// Order SERVICE owns steps up to "ready"; once "ready", it hands off to the
// DELIVERY service via the rabbitmq "order.ready" event. This is EXACTLY why
// event-driven microservices work: order service does not call delivery
// directly, it just says "this order is ready for pickup" on the bus.
//
// PATTERN REMINDER — LAZY INITIALIZATION:
// ---------------------------------------
// RabbitMQ connection is expensive, so it's created ONCE. `initialize()` uses
// an `initialized` flag to guarantee the setup happens only on first use.
// This is a classic "lazy singleton" pattern.
// ============================================================================

import type { OrderInput } from "./order.dto.ts";
import { Order } from "./order.model.ts";
import rabbitmqService from "./rabbitmq.service.ts";
import type { IOrder } from "./types/index.ts";

class OrderService {
  private initialized = false;

  // Ensures RabbitMQ is connected before the first use (and only once).
  async initialize(): Promise<void> {
    if (!this.initialized) {
      await rabbitmqService.initialize();
      this.initialized = true;
    }
  }

  // ---------------------------------------------------------------
  // createOrder()
  // ---------------------------------------------------------------
  // The PRIMARY WRITE path. Result: an order document in MongoDB + an
  // "order.created" message on the RabbitMQ bus.
  async createOrder(userId: string, orderData: OrderInput): Promise<IOrder> {
    // Start RabbitMQ connection
    await this.initialize();

    // Compute the total: sum( price * quantity ) for every item.
    // This is business logic owned by the order service. The client could lie
    // about a totalAmount, so we NEVER trust it from the request.
    const totalAmount = orderData.items.reduce((total, item) => total + item.price * item.quantity, 0);

    // Persist the order in the order service's own database.
    // status starts at "pending" (the first state of the state machine).
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
    // -> Delivery service listens on delivery_queue with binding "order.created"
    //    and will react (create a DeliveryTracking record, find a courier, etc.)
    await rabbitmqService.publishOrderCreated(order);

    return order;
  }

  // READ: single order by its mongodb _id.
  async getOrderById(orderId: string) {
    return await Order.findById(orderId);
  }

  // READ: all orders belonging to one user.
  async getUserOrders(userId: string) {
    return await Order.find({ userId });
  }

  // ---------------------------------------------------------------
  // updateOrderStatus()
  // ---------------------------------------------------------------
  // Used by the restaurant (or admin) to advance the state machine.
  // The SPECIAL trick: when status becomes "ready", a second rabbitmq event
  // ("order.ready") is emitted — telling the delivery service that a courier
  // can now pick the order up. This is how one business flow spans multiple
  // services without direct coupling.
  async updateOrderStatus(orderId: string, newStatus: string) {
    // { new: true } -> return the UPDATED document, not the pre-update one.
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
