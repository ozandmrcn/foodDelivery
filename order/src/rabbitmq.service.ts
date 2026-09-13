// ============================================================================
// 📌 ORDER SERVICE — RABBITMQ PRODUCER (rabbitmq.service.ts)
// ============================================================================
// ⭐ THIS FILE IS WHY YOU ARE LEARNING RABBITMQ — READ CAREFULLY ⭐
//
// 1. WHY EVENT-DRIVEN COMMUNICATION?
// ----------------------------------
// In microservices, services must notify each other. Two ways:
//   a) SYNC (HTTP): order service calls delivery service directly -> couples
//      them (delivery must be up, same network, request blocks). BAD for
//      scaling and fault tolerance.
//   b) ASYNC (message broker): order service PUBLISHES an "order was created"
//      event. Delivery service SUBSCRIBES and reacts. Neither knows the other
//      exists! This is LOOSE COUPLING — the heart of event-driven systems.
// RabbitMQ is the message broker sitting in the middle.
//
// 2. RABBITMQ CORE CONCEPTS (the mental model):
// ---------------------------------------------
//   PRODUCER --------> EXCHANGE -------> BOUNDQUEUE --------> CONSUMER
//   (who Sends)   (receives message   (a "mailbox" that   (the service that
//                     & routes it)        stores messages)   reacts later)
//
//   - BROKER: the RabbitMQ server itself (amqp://localhost:5672).
//   - CONNECTION: one long TCP connection to the broker. app has ONE.
//   - CHANNEL: a lightweight "virtual connection" ON TOP of the real TCP
//     connection. Publish/consume always happens on a channel, NOT on the raw
//     connection. Multiplexing many channels over one TCP saves resources.
//   - EXCHANGE: a router. It receives messages from producers and routes them
//     to queues according to a TYPE + a ROUTING KEY.
//   - QUEUE: a buffer/mailbox. Holds messages until a consumer takes them.
//   - BINDING: the rule "this queue wants messages with routing key X".
//   - ROUTING KEY: a string label on the message (e.g. "order.created").
//
// 3. EXCHANGE TYPES (the 3 classic ones):
// ---------------------------------------
//   - FANOUT : copies EVERY message to ALL bound queues (no routing key logic)
//   - DIRECT : message goes ONLY to the queue bound with the exact same key
//   - TOPIC  : keys are dot-separated and support wildcards
//              `*` matches exactly one word, `#` matches zero+ words.
//              e.g. binding "order.*" matches "order.created","order.ready";
//                   binding "order.#" also matches "order.x.y".
//     THIS PROJECT USES TOPIC — that's why the binding keys are "order.created"
//     and "order.ready", so new consumers can bind with wildcards later.
//
// 4. DURABILITY — "will it survive a restart?"
// --------------------------------------------
//   durable exchange/queue + persistent message = survives broker restart.
//     exchange { durable: true }     -> exchange survives restart
//     queue    { durable: true }     -> queue survives restart
//     publish(..., { persistent: true }) -> the MESSAGE itself is written to
//        disk, so it survives a broker restart while waiting in the queue.
//   Without persistence, a broker crash = messages lost. Easy to forget!
//
// 5. WHY does order service have its OWN copy of this file?
// ---------------------------------------------------------
// There is no shared library; each service that needs messaging carries its
// own rabbitmq.service.ts. Order is the PRODUCER (publishOrderCreated /
// publishOrderReady). Delivery has the CONSUMER copy (channel.consume).
// Both declare THE SAME exchange name and queue names — that's the contract
// they agree on implicitly via naming.
// ============================================================================

import type { Channel, ChannelModel } from "amqplib";
import amqp from "amqplib";
import type { IOrder } from "./types/index.ts";

class RabbitMQService {
  // Class-level state: the connection and channel are reused for the whole
  // lifetime of the process. We do NOT reconnect on every publish.
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  // THE CONTRACT: exchange + queues + binding keys. These names must be
  // identical in Order (producer) and Delivery (consumer), otherwise messages
  // would be published to an exchange nobody consumes from.
  private readonly exchangeName = "food_delivery_exchange";
  private readonly orderQueue = "order_queue";
  private readonly deliveryQueue = "delivery_queue";

  // Setup a connection, channel, exchange, queues and bindings — ONCE.
  async initialize(): Promise<void> {
    try {
      const url = process.env.RABBITMQ_URL || "amqp://localhost:5672";

      // 1. Connect to broker (one TCP connection).
      this.connection = await amqp.connect(url);

      // 2. Open a channel on top of that connection.
      this.channel = await this.connection.createChannel();

      // 3. Create (or re-use) the TOPIC exchange, durable.
      //    topic => routing by pattern ("order.*"" matches "order.created").
      await this.channel.assertExchange(this.exchangeName, "topic", {
        durable: true,
      });

      // 4. Create the queues (durable = survive broker restart).
      await this.channel.assertQueue(this.orderQueue, { durable: true });
      await this.channel.assertQueue(this.deliveryQueue, { durable: true });

      // 5. BINDINGS: tell the exchange which queues are interested in which
      //    routing keys. Here delivery_queue subscribes to both order.created
      //    and order.ready events.
      await this.channel.bindQueue(this.deliveryQueue, this.exchangeName, "order.created");
      await this.channel.bindQueue(this.deliveryQueue, this.exchangeName, "order.ready");

      console.log("Order service rabbitmq initialized");
    } catch (error) {
      // NOTE: in production you would retry the connection (exponential backoff)
      // instead of just logging and continuing with a broken channel.
      console.log("Order service rabbitmq initialization failed:", error);
    }
  }

  // ---------------------------------------------------------------
  // PRODUCER METHOD #1: publishOrderCreated()
  // ---------------------------------------------------------------
  // Fire-and-forget: called right after an order is saved, so the delivery
  // service can start looking for an available courier.
  async publishOrderCreated(order: IOrder): Promise<void> {
    if (!this.channel) {
      console.log("Rabbitmq not initialized");
      return;
    }

    // RabbitMQ messages are Buffers (binary). JSON.stringify the object,
    // then convert the string to a Buffer.
    const message = Buffer.from(JSON.stringify(order));

    // publish(exchange, routingKey, content, options)
    //  - routingKey "order.created" is matched against queue bindings.
    //  - { persistent: true } -> message survives broker restart.
    this.channel.publish(this.exchangeName, "order.created", message, {
      persistent: true,
    });

    console.log(`Order created event published: ${order._id}`);
  }

  // ---------------------------------------------------------------
  // PRODUCER METHOD #2: publishOrderReady()
  // ---------------------------------------------------------------
  // Called when the restaurant marks the order "ready". Note that this message
  // carries a DIFFERENT payload than the order.created one (pickup info for the
  // courier, estimated time, etc.) — producers decide the event schema, the
  // consumer must parse whatever schema was agreed on.
  async publishOrderReady(order: IOrder): Promise<void> {
    if (!this.channel) {
      console.log("Rabbitmq not initialized");
      return;
    }

    // NOTE: this payload does NOT include full order details — only what the
    // delivery service needs for the courier pickup.
    const message = {
      orderId: order._id,
      userId: order.userId,
      restaurantId: order.restaurantId,
      deliveryAddress: order.deliveryAddress, // where the courier must deliver
      estimatedDeliveryTime: 30, // hardcoded for now (easy to change later!)
      timeStamp: new Date().toISOString(), // when the event was emitted
    };

    const messageBuffer = Buffer.from(JSON.stringify(message));

    // Routing key "order.ready" — consumed by the delivery service queue.
    this.channel.publish(this.exchangeName, "order.ready", messageBuffer, {
      persistent: true,
    });

    console.log(`Order ready event published: ${order._id}`);
  }
}

// Singleton export — every caller in this service shares one channel/connection.
export default new RabbitMQService();
