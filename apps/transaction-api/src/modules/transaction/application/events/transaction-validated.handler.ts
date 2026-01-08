import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { TransactionValidatedEvent } from '@yape/shared-types';
import { TransactionRepository } from '../../infrastructure/repositories/transaction.repository';

@EventsHandler(TransactionValidatedEvent)
export class TransactionValidatedHandler
  implements IEventHandler<TransactionValidatedEvent>
{
  private readonly logger = new Logger(TransactionValidatedHandler.name);

  constructor(private readonly repository: TransactionRepository) {}

  async handle(event: TransactionValidatedEvent) {
    this.logger.log(`Handling transaction validated event`, {
      transactionId: event.data.transactionExternalId,
      status: event.data.status,
    });

    // Mapear status string a ID
    const statusId = event.data.status === 'approved' ? 2 : 3;

    // Actualizar status en DB
    await this.repository.updateStatus(
      event.data.transactionExternalId,
      statusId,
    );

    this.logger.log(`Transaction ${event.data.transactionExternalId} updated to ${event.data.status}`);
  }
}
