import type { Channel, ChannelModel } from "amqplib";
import amqp from "amqplib";

class RabbitMQService {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
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

      // Create exchange
      // type:topic => allows routing based on pattern matching (ex. order.* => order.created, order.updated)
      // durable:true => exchange will survive broker restart
      await this.channel.assertExchange(this.exchangeName, "topic", {
        durable: true,
      });

      // Create queues
      await this.channel.assertQueue(this.orderQueue, { durable: true });
      await this.channel.assertQueue(this.deliveryQueue, { durable: true });

      // Bind queues to exchange
      await this.channel.bindQueue(this.deliveryQueue, this.exchangeName, "order.created");
      await this.channel.bindQueue(this.deliveryQueue, this.exchangeName, "order.ready");

      // Start listening to delivery queue
      await this.listenToDeliveryQueue();

      console.log("Order service rabbitmq initialized");
    } catch (error) {
      console.log("Order service rabbitmq initialization failed:", error);
    }
  }

  async listenToDeliveryQueue(): Promise<void> {
    if (!this.channel) {
      throw new Error("RabbitMQ connection not established. Please initialize RabbitMQ first.");
    }

    this.channel.consume(this.deliveryQueue, async (message) => {
      const deliveryMessage = JSON.parse(message!.content.toString());

      console.log("Delivery event request that came from Order service:", deliveryMessage);
    });
  }
}

export default new RabbitMQService();
