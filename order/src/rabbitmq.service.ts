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
    } catch (error) {
      //
    }
  }
}

export default new RabbitMQService();
