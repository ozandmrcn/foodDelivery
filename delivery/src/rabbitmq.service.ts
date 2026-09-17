/* @file rabbitmq.service.ts — RabbitMQ CONSUMER of the Delivery service.
 * Counterpart of the Order service producer:
 *   ORDER (producer): publishOrderCreated / publishOrderReady -> pushes events
 *   DELIVERY (consumer): channel.consume(deliveryQueue, cb) -> reacts to events
 *
 * How consume works: RabbitMQ pushes each queued message to the callback one
 * at a time; message.content is the Buffer holding the producer's JSON payload.
 *
 * @note ACK semantics: default (autoAck) deletes the message from the queue
 *   as soon as it is delivered — if the handler crashes mid-processing the
 *   message is lost. Production typically uses { noAck: false } + explicit
 *   message.ack()/nack() to enable retries.
 *
 * The handler below is where the "order.created" flow continues: it creates a
 * DeliveryTracking doc, finds an available courier, and assigns atomically —
 * keeping this service in sync WITHOUT any HTTP call to the order service.
 */

import type { Channel, ChannelModel } from "amqplib";
import amqp from "amqplib";
import type { IOrder } from "./types/index.ts";
import { Courier, DeliveryTracking } from "./delivery.model.ts";

class RabbitMQService {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  // @contract SAME names as the order service's file = the inter-service contract.
  private readonly exchangeName = "food_delivery_exchange";
  private readonly orderQueue = "order_queue";
  private readonly deliveryQueue = "delivery_queue";

  /**
   * Connect, declare the topology, and start consuming.
   * @throws {Error} Logged but not rethrown; the service keeps running
   */
  async initialize(): Promise<void> {
    try {
      // @env RABBITMQ_URL — default to the local broker
      const url = process.env.RABBITMQ_URL || "amqp://localhost:5672";

      // * Connect to the broker (one TCP connection).
      this.connection = await amqp.connect(url);

      // * Create a channel on top of the connection.
      this.channel = await this.connection.createChannel();

      // * Create the SAME topic exchange as the producer:
      //   type topic => pattern-based routing (order.* matches order.created)
      //   durable   => survives broker restart
      await this.channel.assertExchange(this.exchangeName, "topic", {
        durable: true,
      });

      // * Create queues (durable).
      await this.channel.assertQueue(this.orderQueue, { durable: true });
      await this.channel.assertQueue(this.deliveryQueue, { durable: true });

      // * Bind: this queue subscribes to events published by the order service.
      await this.channel.bindQueue(this.deliveryQueue, this.exchangeName, "order.created");
      await this.channel.bindQueue(this.deliveryQueue, this.exchangeName, "order.ready");

      // * Start listening — the process stays "on" from this moment on.
      await this.listenToDeliveryQueue();

      console.log("Delivery service rabbitmq initialized");
    } catch (error) {
      console.log("Delivery service rabbitmq initialization failed:", error);
    }
  }

  // * THE CONSUMER — the only part that differs from the order service.
  /**
   * Register the callback that handles every message on the delivery queue.
   * @throws {Error} If the channel is not initialized yet
   */
  async listenToDeliveryQueue(): Promise<void> {
    if (!this.channel) {
      throw new Error("RabbitMQ connection not established. Please initialize RabbitMQ first.");
    }

    // @consumer Callback fires automatically for each queued message.
    this.channel.consume(this.deliveryQueue, async (message) => {
      const deliveryMessage = JSON.parse(message!.content.toString()) as IOrder & { id?: string };
      const orderId = deliveryMessage._id?.toString() ?? deliveryMessage.id;

      // * Case 1: "order.created" — a new order just entered the system.
      // Track it, then find + assign an available courier.
      if (deliveryMessage.status === "pending") {
        // (A) Create DeliveryTracking { orderId, status: "pending" } so the
        //     order becomes trackable.
        const deliveryTracking = await DeliveryTracking.create({
          orderId,
          courierId: null,
          status: "pending",
          estimatedDeliveryTime: new Date(Date.now() + 60 * 60 * 1000),
          ...(deliveryMessage.specialInstructions && { notes: deliveryMessage.specialInstructions }),
        });

        // (B) Find the oldest available courier.
        const courier = await Courier.findOne({ status: "available", isAvailable: true }).sort({ createdAt: 1 });

        if (courier) {
          // (C) @atomic Claim the delivery: guard { courierId: null } prevents
          //     two couriers claiming the same order (no locks needed).
          await DeliveryTracking.findByIdAndUpdate(deliveryTracking.id, { courierId: courier.id, status: "assigned" });

          // (D) @atomic Mark the courier busy.
          await Courier.findByIdAndUpdate(courier.id, { status: "busy", isAvailable: false });
        }
      }

      // * Case 2: "order.ready" — restaurant finished; update tracking so the
      //   courier can pick the order up.
      if (deliveryMessage.status === "ready") {
        await DeliveryTracking.findOneAndUpdate({ orderId: deliveryMessage._id }, { status: "ready" });
      }
    });
  }
}

export default new RabbitMQService();