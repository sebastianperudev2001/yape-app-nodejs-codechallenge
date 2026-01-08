import { InputType, Field, Int, Float } from '@nestjs/graphql';
import { IsUUID, IsInt, IsNumber, Min } from 'class-validator';

@InputType()
export class CreateTransactionInput {
  @Field()
  @IsUUID()
  accountExternalIdDebit: string;

  @Field()
  @IsUUID()
  accountExternalIdCredit: string;

  @Field(() => Int)
  @IsInt()
  tranferTypeId: number;

  @Field(() => Float)
  @IsNumber()
  @Min(0.01)
  value: number;
}
