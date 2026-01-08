import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaProducer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducer.name);
  private kafka: Kafka;
  private producer: Producer;

  constructor(private configService: ConfigService) {
    this.kafka = new Kafka({
      clientId: this.configService.get<string>('kafka.clientId'),
      brokers: [this.configService.get<string>('kafka.brokers')],
    });

    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();
    this.logger.log('Kafka producer connected');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    this.logger.log('Kafka producer disconnected');
  }

  async send(topic: string, message: any): Promise<void> {
    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: message.data.transactionExternalId,
            value: JSON.stringify(message),
            headers: {
              'correlation-id': message.correlationId,
              'event-type': message.eventType,
            },
          },
        ],
      });

      this.logger.debug(`Message sent to topic ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to send message to ${topic}`, error);
      throw error;
    }
  }
}
