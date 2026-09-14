// ============================================================================
// 📌 DELIVERY SERVICE — RABBITMQ CONSUMER (rabbitmq.service.ts)
// ============================================================================
// ⭐ THE COUNTERPART OF THE ORDER SERVICE PRODUCER — READ THIS COMPARISON ⭐
//
// ORDER SERVICE (producer)          |  DELIVERY SERVICE (consumer)
// --------------------------------- |  ----------------------------------
// publishOrderCreated(order)        |  channel.consume(deliveryQueue, cb)
// publishOrderReady(order)          |  callback receives { orderId, ... }
// -> pushes messages ONTO the bus   |  -> POLLS the queue for messages
//
// HOW CONSUME WORKS (the magic):
// -------------------------------
//   this.channel.consume(queue, handler)
// RabbitMQ pushes messages from the queue to this callback one by one.
// The handler receives a `message` object; `message.content` is a Buffer
// containing the JSON payload that the producer serialized.
//
// THE BUS ACKNOWLEDGES (ack) THE MESSAGE:
// By default, consuming marks messages as "acknowledged" automatically
// (autoAck). Once acked, the message is DELETED from the queue — meaning if
// the handler crashes mid-processing, the message is lost. In production you
// would use { noAck: false } and call message.ack() / nack() explicitly to
// retry failed messages. Worth remembering!
//
// THE EMPTY `if (deliveryMessage.status === "pending")` BLOCK BELOW:
// ------------------------------------------------------------------
// This block is currently EMPTY on purpose — the logic that assigns a courier
// is not implemented yet. When you come back to this project, THIS is where
// the "order.created" flow continues. The intended behavior (in exact order):
//
//   1. if status === "pending"  -> a NEW order just entered the system.
//      a) Create a DeliveryTracking document { orderId, status: "pending" }
//         in the delivery database, so the order becomes trackable.
//      b) Find an AVAILABLE courier: Courier.findOne({ isAvailable: true,
//         status: "available" }).
//      c) OPTIMISTIC CLAIM: findOneAndUpdate the delivery with
//         { courierId, status: "assigned" } guarded by courierId: { $exists: false }
//         — this atomic guard prevents TWO couriers claiming the same order.
//      d) Mark the courier busy / save the acceptedAt timestamp.
//
//   2. if status === "ready"     -> restaurant finished preparing; update the
//      DeliveryTracking document (status: "ready") so the courier can pick it up.
//
// In short: order.service PUBLISHES order.created / order.ready, and this
// consume callback is the receiving end that keeps the delivery service in
// sync with the rest of the system WITHOUT any HTTP call between the two.
// ============================================================================

import type { Channel, ChannelModel } from "amqplib";
import amqp from "amqplib";
import type { IOrder } from "./types/index.ts";
import { Courier, DeliveryTracking } from "./delivery.model.ts";

class RabbitMQService {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  // SAME names as the order service's rabbitmq file = the shared contract.
  private readonly exchangeName = "food_delivery_exchange";
  private readonly orderQueue = "order_queue";
  private readonly deliveryQueue = "delivery_queue";

  async initialize(): Promise<void> {
    try {
      const url = process.env.RABBITMQ_URL || "amqp://localhost:5672";

      // Connect to broker
      this.connection = await amqp.connect(url);

      // Create channel
      this.channel = await this.connection.createChannel();

      // Create exchange (must use the SAME name/type as the producer!)
      // type:topic => allows routing based on pattern matching (ex. order.* => order.created, order.updated)
      // durable:true => exchange will survive broker restart
      await this.channel.assertExchange(this.exchangeName, "topic", {
        durable: true,
      });

      // Create queues
      await this.channel.assertQueue(this.orderQueue, { durable: true });
      await this.channel.assertQueue(this.deliveryQueue, { durable: true });

      // Bind queues to exchange — delivery_queue listens for order.created
      // and order.ready events published by the ORDER service.
      await this.channel.bindQueue(this.deliveryQueue, this.exchangeName, "order.created");
      await this.channel.bindQueue(this.deliveryQueue, this.exchangeName, "order.ready");

      // Start listening to delivery queue
      await this.listenToDeliveryQueue();

      console.log("Delivery service rabbitmq initialized");
    } catch (error) {
      console.log("Delivery service rabbitmq initialization failed:", error);
    }
  }

  // ---------------------------------------------------------------
  // THE CONSUMER — the only part that differs from the order service.
  // ---------------------------------------------------------------
  // What happens on the bus tour:
  //   [Order svc publishes "order.created"] -> exchange routes it ->
  //   delivery_queue -> THIS callback fires with the message payload.
  async listenToDeliveryQueue(): Promise<void> {
    if (!this.channel) {
      throw new Error("RabbitMQ connection not established. Please initialize RabbitMQ first.");
    }

    // consumer callback: automatically invoked for each queued message.
    this.channel.consume(this.deliveryQueue, async (message) => {
      // message.content = Buffer -> toString() -> JSON.parse to reconstruct
      // the original object the producer sent (the IOrder document payload).
      // NB: the producer's toJSON transform renames _id -> id, so the parsed
      // payload carries `id` on order.created (and `orderId` on order.ready).
      const deliveryMessage = JSON.parse(message!.content.toString()) as IOrder & { id?: string };
      const orderId = deliveryMessage._id?.toString() ?? deliveryMessage.id;

      // ══════════════════════════════════════════════════════════════════
      // if delivery status is pending create a new delivery tracking
      if (deliveryMessage.status === "pending") {
        // (A) Create DeliveryTracking { orderId, status: "pending" }
        const deliveryTracking = await DeliveryTracking.create({
          orderId,
          status: "pending",
          estimatedDeliveryTime: new Date(Date.now() + 60 * 60 * 1000),
          ...(deliveryMessage.specialInstructions && { notes: deliveryMessage.specialInstructions }),
        });

        // (B) Find an available courier
        const courier = await Courier.findOne({ status: "available", isAvailable: true }).sort({ createdAt: 1 });

        // (C) claim delivery atomically with { courierId, status: "assigned" }
        if (courier) {
          await DeliveryTracking.findByIdAndUpdate(deliveryTracking.id, { courierId: courier.id, status: "assigned" });
        }
        // (D) mark courier busy, save acceptedAt
      }
    });
  }
}

export default new RabbitMQService();
