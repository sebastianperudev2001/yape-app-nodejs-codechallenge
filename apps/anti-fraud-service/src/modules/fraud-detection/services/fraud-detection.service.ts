import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TransactionCreatedEvent, TransactionValidatedEvent } from '@yape/shared-types';
import { KafkaProducer } from '../../../infrastructure/messaging/kafka.producer';

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);
  private readonly AMOUNT_THRESHOLD = 1000;

  constructor(private readonly kafkaProducer: KafkaProducer) {}

  async validateTransaction(event: TransactionCreatedEvent): Promise<void> {
    const { data, correlationId } = event;

    this.logger.log(`Validating transaction ${data.transactionExternalId}`, {
      correlationId,
      value: data.value,
    });

    // Regla de negocio: rechazar si > 1000
    const isApproved = data.value <= this.AMOUNT_THRESHOLD;
    const status = isApproved ? 'approved' : 'rejected';
    const reason = isApproved
      ? undefined
      : `Transaction amount ${data.value} exceeds threshold ${this.AMOUNT_THRESHOLD}`;

    // Crear evento de validación
    const validationEvent: TransactionValidatedEvent = {
      eventId: uuidv4(),
      eventType: 'transaction.validated',
      eventVersion: '1.0',
      timestamp: new Date().toISOString(),
      correlationId,
      data: {
        transactionExternalId: data.transactionExternalId,
        status,
        reason,
        validatedAt: new Date().toISOString(),
      },
    };

    // Publicar a Kafka
    await this.kafkaProducer.send('transaction.validated', validationEvent);

    this.logger.log(`Transaction ${data.transactionExternalId} validated: ${status.toUpperCase()}`);
  }
}
