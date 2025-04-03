import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, EachMessagePayload, Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;

  constructor(private readonly configService: ConfigService) {
    this.kafka = new Kafka({
      clientId: 'bulk-mail-service',
      brokers: [
        this.configService.get<string>('KAFKA_BROKERS', 'localhost:9092'),
      ],
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({
      groupId: 'bulk-mail-consumer',
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

  /**
   * 메시지를 발행합니다.
   */
  async emit(topic: string, message: any) {
    await this.producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
  }

  /**
   * 토픽을 구독하고 메시지를 처리합니다.
   */
  async subscribe(
    topic: string,
    callback: (message: EachMessagePayload) => Promise<void>,
  ) {
    await this.consumer.subscribe({ topic });
    await this.consumer.run({
      eachMessage: callback,
    });
  }
}
