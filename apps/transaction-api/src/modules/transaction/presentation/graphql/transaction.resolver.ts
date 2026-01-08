import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { TransactionModel } from './models/transaction.model';
import { CreateTransactionInput } from './inputs/create-transaction.input';
import { CreateTransactionCommand } from '../../application/commands/create-transaction.handler';
import { GetTransactionQuery } from '../../application/queries/get-transaction.handler';

@Resolver(() => TransactionModel)
export class TransactionResolver {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Mutation(() => TransactionModel, {
    description: 'Create a new transaction',
  })
  async createTransaction(
    @Args('input') input: CreateTransactionInput,
  ): Promise<TransactionModel> {
    const command = new CreateTransactionCommand(
      input.accountExternalIdDebit,
      input.accountExternalIdCredit,
      input.tranferTypeId,
      input.value,
    );

    return this.commandBus.execute(command);
  }

  @Query(() => TransactionModel, {
    description: 'Get transaction by external ID',
  })
  async transaction(
    @Args('transactionExternalId') id: string,
  ): Promise<TransactionModel> {
    const query = new GetTransactionQuery(id);
    return this.queryBus.execute(query);
  }
}
