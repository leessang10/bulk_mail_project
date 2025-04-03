import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private readonly clientId: string;
  private readonly brokers: string[];

  constructor(private readonly configService: ConfigService) {
    this.clientId =
      this.configService.get('KAFKA_CLIENT_ID') || 'bulk-mail-service';
    this.brokers = [this.configService.get('KAFKA_BROKER') || 'localhost:9092'];

    this.kafka = new Kafka({
      clientId: this.clientId,
      brokers: this.brokers,
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({
      groupId: this.configService.get('KAFKA_GROUP_ID') || 'mail-group',
    });
  }

  async onModuleInit() {
    await this.producer.connect();
    await this.consumer.connect();
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    await this.consumer.disconnect();
  }

  async sendMessage(topic: string, message: any) {
    return this.producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
  }

  async subscribe(topics: string[], callback: (message: any) => Promise<void>) {
    await Promise.all(
      topics.map((topic) => this.consumer.subscribe({ topic })),
    );

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const value = message.value.toString();
          const parsedValue = JSON.parse(value);
          await callback(parsedValue);
        } catch (error) {
          console.error('Error processing Kafka message:', error);
        }
      },
    });
  }
}
