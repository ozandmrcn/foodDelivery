import type { Channel, ChannelModel } from "amqplib";
import amqp from "amqplib";

class RabbitMQService {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private readonly exchangeName = "food_delivery_exchange";
  private readonly orderQueue = "order_queue";
  private readonly deliveryQueue = "delivery_queue";

  async initialize() {
    try {
      const url = process.env.RABBITMQ_URL || "amqp://localhost:5672";

      // Connect to broker
      this.connection = await amqp.connect(url);

      // Create channel
      this.channel = await this.connection.createChannel();

      // Create exchange
      // durable:true => exchange will survive broker restart
      await this.channel.assertExchange(this.exchangeName, "topic", {
        durable: true,
      });

      // Create queues
      await this.channel.assertQueue(this.orderQueue, { durable: true });
      await this.channel.assertQueue(this.deliveryQueue, { durable: true });

      // Bind queues to exchange
      await this.channel.bindQueue(this.orderQueue, this.exchangeName, "order.created");
      await this.channel.bindExchange(this.deliveryQueue, this.exchangeName, "order.ready");

      console.log("Order service rabbitmq initialized");
    } catch (error) {
      console.log("Order service rabbitmq initialization failed:", error);
    }
  }
}

export default new RabbitMQService();
