import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer } from 'kafkajs';
import { TransactionCreatedEvent } from '@yape/shared-types';
import { FraudDetectionService } from '../services/fraud-detection.service';

@Injectable()
export class TransactionCreatedConsumer implements OnModuleInit {
  private readonly logger = new Logger(TransactionCreatedConsumer.name);
  private kafka: Kafka;
  private consumer: Consumer;

  constructor(
    private configService: ConfigService,
    private fraudDetectionService: FraudDetectionService,
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
      topic: 'transaction.created',
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event: TransactionCreatedEvent = JSON.parse(
            message.value.toString(),
          );

          this.logger.log(`Processing transaction ${event.data.transactionExternalId}`);

          // Validar transacción
          await this.fraudDetectionService.validateTransaction(event);
        } catch (error) {
          this.logger.error('Error processing message', error);
        }
      },
    });

    this.logger.log('Anti-fraud consumer started and listening to transaction.created');
  }
}
