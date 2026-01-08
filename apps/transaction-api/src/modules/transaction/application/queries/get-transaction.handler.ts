import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { TransactionRepository } from '../../infrastructure/repositories/transaction.repository';

export class GetTransactionQuery {
  constructor(public readonly transactionExternalId: string) {}
}

@QueryHandler(GetTransactionQuery)
@Injectable()
export class GetTransactionHandler implements IQueryHandler<GetTransactionQuery> {
  private readonly logger = new Logger(GetTransactionHandler.name);

  constructor(private readonly repository: TransactionRepository) {}

  async execute(query: GetTransactionQuery): Promise<any> {
    this.logger.log(`Querying transaction: ${query.transactionExternalId}`);

    const transaction = await this.repository.findByExternalId(
      query.transactionExternalId,
    );

    if (!transaction) {
      throw new NotFoundException(
        `Transaction with ID ${query.transactionExternalId} not found`,
      );
    }

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
