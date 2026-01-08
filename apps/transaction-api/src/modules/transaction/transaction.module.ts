import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Presentation Layer
import { TransactionController } from './presentation/rest/transaction.controller';
import { TransactionResolver } from './presentation/graphql/transaction.resolver';

// Application Layer
import { CreateTransactionHandler } from './application/commands/create-transaction.handler';
import { GetTransactionHandler } from './application/queries/get-transaction.handler';
import { TransactionValidatedHandler } from './application/events/transaction-validated.handler';

// Infrastructure
import { TransactionRepository } from './infrastructure/repositories/transaction.repository';

const CommandHandlers = [CreateTransactionHandler];
const QueryHandlers = [GetTransactionHandler];
const EventHandlers = [TransactionValidatedHandler];

@Module({
  imports: [CqrsModule],
  controllers: [TransactionController],
  providers: [
    TransactionResolver,
    TransactionRepository,
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
  ],
})
export class TransactionModule {}
