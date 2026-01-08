import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBus } from '@nestjs/cqrs';
import { Kafka, Consumer } from 'kafkajs';
import { TransactionValidatedEvent } from '@yape/shared-types';

@Injectable()
export class KafkaConsumer implements OnModuleInit {
  private readonly logger = new Logger(KafkaConsumer.name);
  private kafka: Kafka;
  private consumer: Consumer;

  constructor(
    private configService: ConfigService,
    private eventBus: EventBus,
  ) {
    this.kafka = new Kafka({
      clientId: this.configService.get<string>('kafka.clientId'),
      brokers: [this.configService.get<string>('kafka.brokers')],
    });

    this.consumer = this.kafka.consumer({
      groupId: this.configService.get<string>('kafka.groupId'),
    });
  }

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: 'transaction.validated',
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event: TransactionValidatedEvent = JSON.parse(
            message.value.toString(),
          );

          this.logger.log(`Received event from ${topic}`, {
            eventId: event.eventId,
            transactionId: event.data.transactionExternalId,
            status: event.data.status,
          });

          // Despachar al event bus de CQRS
          this.eventBus.publish(event);
        } catch (error) {
          this.logger.error('Error processing message', error);
        }
      },
    });

    this.logger.log('Kafka consumer started and listening to transaction.validated');
  }
}
