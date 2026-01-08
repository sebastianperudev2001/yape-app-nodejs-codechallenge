import { ObjectType, Field, ID, Float } from '@nestjs/graphql';

@ObjectType()
class TransactionTypeModel {
  @Field()
  name: string;
}

@ObjectType()
class TransactionStatusModel {
  @Field()
  name: string;
}

@ObjectType()
export class TransactionModel {
  @Field(() => ID)
  transactionExternalId: string;

  @Field(() => TransactionTypeModel)
  transactionType: TransactionTypeModel;

  @Field(() => TransactionStatusModel)
  transactionStatus: TransactionStatusModel;

  @Field(() => Float)
  value: number;

  @Field()
  createdAt: Date;
}
