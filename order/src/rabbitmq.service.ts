/* @file rabbitmq.service.ts — RabbitMQ PRODUCER of the Order service.
 * Publishes order.created / order.ready events so the Delivery service can
 * react without any direct coupling. @see delivery/src/rabbitmq.service.ts.
 *
 * RabbitMQ mental model (recap):
 *   PRODUCER ---> EXCHANGE ---(binding)---> QUEUE ---> CONSUMER
 *   - BROKER  : the RabbitMQ server (amqp://localhost:5672).
 *   - CONNECTION: one long TCP connection to the broker.
 *   - CHANNEL : lightweight multiplexed "virtual connection" on the TCP link.
 *   - EXCHANGE: router; routes messages to queues by TYPE + ROUTING KEY.
 *   - TOPIC EXCHANGE: routing keys are dot-separated; `*` = one word,
 *     `#` = zero+ words. Used here so new consumers can bind with wildcards.
 *   - QUEUE   : durable mailbox holding messages until a consumer takes them.
 *   - BINDING : the rule "queue X wants routing keys matching Y".
 *   - DURABILITY: durable exchange/queue + { persistent: true } publish =
 *     messages survive a broker restart. Easy one to forget!
 */

import type { Channel, ChannelModel } from "amqplib";
import amqp from "amqplib";
import type { IOrder } from "./types/index.ts";

class RabbitMQService {
  // @singleton Connection + channel are reused for the whole process lifetime.
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  // @contract Exchange + queue + binding names MUST match the Delivery
  //   consumer service — naming agreement is the implicit inter-service contract.
  private readonly exchangeName = "food_delivery_exchange"; // @exchange topic, durable
  private readonly orderQueue = "order_queue"; // @queue order service's own queue
  private readonly deliveryQueue = "delivery_queue"; // @queue consumed by delivery

  // * Setup: connection, channel, exchange, queues, bindings — ONCE.
  /**
   * Initialize the broker connection and declare the topology.
   * @throws {Error} Logged but not rethrown; channel stays null so publishes no-op safely
   */
  async initialize(): Promise<void> {
    try {
      // @env RABBITMQ_URL — falls back to the default Docker-less endpoint
      const url = process.env.RABBITMQ_URL || "amqp://localhost:5672";

      // 1. One TCP connection to the broker.
      this.connection = await amqp.connect(url);

      // 2. A channel on top of that connection (where publish/consume happen).
      this.channel = await this.connection.createChannel();

      // 3. Create (or reuse) the TOPIC exchange, durable.
      await this.channel.assertExchange(this.exchangeName, "topic", {
        durable: true,
      });

      // 4. Durable queues -> they survive broker restarts.
      await this.channel.assertQueue(this.orderQueue, { durable: true });
      await this.channel.assertQueue(this.deliveryQueue, { durable: true });

      // 5. Bindings: delivery_queue subscribes to both events.
      await this.channel.bindQueue(this.deliveryQueue, this.exchangeName, "order.created");
      await this.channel.bindQueue(this.deliveryQueue, this.exchangeName, "order.ready");

      console.log("Order service rabbitmq initialized");
    } catch (error) {
      // @todo Production: retry with exponential backoff instead of logging on.
      console.log("Order service rabbitmq initialization failed:", error);
    }
  }

  // * PRODUCER #1: publishOrderCreated()
  /**
   * Fire-and-forget event published right after an order is saved, so the
   * delivery service can look for an available courier.
   * @param order - The freshly created order document
   * @routingKey order.created — matched against the delivery queue binding
   */
  async publishOrderCreated(order: IOrder): Promise<void> {
    if (!this.channel) {
      console.log("Rabbitmq not initialized");
      return;
    }

    // RabbitMQ messages are Buffers: stringify the object, then wrap in Buffer.
    const message = Buffer.from(JSON.stringify(order));

    // @note { persistent: true } writes the message to disk -> survives restart.
    this.channel.publish(this.exchangeName, "order.created", message, {
      persistent: true,
    });

    console.log(`Order created event published: ${order._id}`);
  }

  // * PRODUCER #2: publishOrderReady()
  /**
   * Called when the restaurant marks the order "ready".
   * @param order - The order document (schema of the base order)
   * @routingKey order.ready
   * @note This payload carries a DIFFERENT schema than order.created — only the
   *   pickup/delivery info the courier needs. Producer defines the event schema;
   *   the consumer must parse whatever was agreed on.
   */
  async publishOrderReady(order: IOrder): Promise<void> {
    if (!this.channel) {
      console.log("Rabbitmq not initialized");
      return;
    }

    const message = {
      orderId: order._id,
      userId: order.userId,
      restaurantId: order.restaurantId,
      deliveryAddress: order.deliveryAddress, // where the courier must deliver
      estimatedDeliveryTime: 30, // hardcoded for now (easy to change later!)
      timeStamp: new Date().toISOString(), // when the event was emitted
    };

    const messageBuffer = Buffer.from(JSON.stringify(message));

    this.channel.publish(this.exchangeName, "order.ready", messageBuffer, {
      persistent: true,
    });
  }
}

// @singleton Everyone importing this service shares one channel/connection.
export default new RabbitMQService();