import { IsUUID, IsInt, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Debit account external ID',
  })
  @IsUUID()
  accountExternalIdDebit: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Credit account external ID',
  })
  @IsUUID()
  accountExternalIdCredit: string;

  @ApiProperty({
    example: 1,
    description: 'Transfer type ID',
  })
  @IsInt()
  tranferTypeId: number;

  @ApiProperty({
    example: 500,
    description: 'Transaction value',
  })
  @IsNumber()
  @Min(0.01)
  value: number;
}
