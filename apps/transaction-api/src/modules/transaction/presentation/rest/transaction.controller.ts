import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreateTransactionCommand } from '../../application/commands/create-transaction.handler';
import { GetTransactionQuery } from '../../application/queries/get-transaction.handler';

@Controller('transactions')
@ApiTags('transactions')
export class TransactionController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({
    status: 201,
    description: 'Transaction created successfully',
  })
  async create(@Body() dto: CreateTransactionDto) {
    const command = new CreateTransactionCommand(
      dto.accountExternalIdDebit,
      dto.accountExternalIdCredit,
      dto.tranferTypeId,
      dto.value,
    );

    return this.commandBus.execute(command);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by external ID' })
  @ApiResponse({ status: 200, description: 'Transaction found' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getById(@Param('id') id: string) {
    const query = new GetTransactionQuery(id);
    return this.queryBus.execute(query);
  }
}
