import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TransactionRepository } from '../../infrastructure/repositories/transaction.repository';
import { KafkaProducer } from '../../../../infrastructure/messaging/kafka.producer';
import { TransactionCreatedEvent } from '@yape/shared-types';

export class CreateTransactionCommand {
  constructor(
    public readonly accountExternalIdDebit: string,
    public readonly accountExternalIdCredit: string,
    public readonly transferTypeId: number,
    public readonly value: number,
  ) {}
}

@CommandHandler(CreateTransactionCommand)
@Injectable()
export class CreateTransactionHandler
  implements ICommandHandler<CreateTransactionCommand>
{
  private readonly logger = new Logger(CreateTransactionHandler.name);

  constructor(
    private readonly repository: TransactionRepository,
    private readonly kafkaProducer: KafkaProducer,
  ) {}

  async execute(command: CreateTransactionCommand): Promise<any> {
    const correlationId = uuidv4();
    const transactionExternalId = uuidv4();

    this.logger.log(`Creating transaction: ${transactionExternalId}`, {
      correlationId,
    });

    // 1. Guardar en DB con status "pending"
    const transaction = await this.repository.create({
      transactionExternalId,
      accountExternalIdDebit: command.accountExternalIdDebit,
      accountExternalIdCredit: command.accountExternalIdCredit,
      transferTypeId: command.transferTypeId,
      value: command.value,
      transactionStatusId: 1, // pending
    });

    // 2. Publicar evento a Kafka
    const event: TransactionCreatedEvent = {
      eventId: uuidv4(),
      eventType: 'transaction.created',
      eventVersion: '1.0',
      timestamp: new Date().toISOString(),
      correlationId,
      data: {
        transactionExternalId: transaction.transactionExternalId,
        accountExternalIdDebit: transaction.accountExternalIdDebit,
        accountExternalIdCredit: transaction.accountExternalIdCredit,
        transferTypeId: transaction.transferTypeId,
        value: Number(transaction.value),
        createdAt: transaction.createdAt.toISOString(),
      },
    };

    await this.kafkaProducer.send('transaction.created', event);

    this.logger.log(`Transaction created and event published: ${transactionExternalId}`);

    return this.mapToResponse(transaction);
  }

  private mapToResponse(transaction: any) {
    return {
      transactionExternalId: transaction.transactionExternalId,
      transactionType: {
        name: transaction.transactionType.name,
      },
      transactionStatus: {
        name: transaction.transactionStatus.name,
      },
      value: Number(transaction.value),
      createdAt: transaction.createdAt,
    };
  }
}
