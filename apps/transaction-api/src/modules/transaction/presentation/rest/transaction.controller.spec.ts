import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { TransactionController } from './transaction.controller';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreateTransactionCommand } from '../../application/commands/create-transaction.handler';
import { GetTransactionQuery } from '../../application/queries/get-transaction.handler';

describe('TransactionController', () => {
  let controller: TransactionController;
  let commandBus: jest.Mocked<CommandBus>;
  let queryBus: jest.Mocked<QueryBus>;

  beforeEach(async () => {
    // Prepare: Create mocks
    const mockCommandBus = {
      execute: jest.fn(),
    };

    const mockQueryBus = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionController],
      providers: [
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
        {
          provide: QueryBus,
          useValue: mockQueryBus,
        },
      ],
    }).compile();

    controller = module.get<TransactionController>(TransactionController);
    commandBus = module.get(CommandBus) as jest.Mocked<CommandBus>;
    queryBus = module.get(QueryBus) as jest.Mocked<QueryBus>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('debería crear una transacción y retornar el resultado', async () => {
      // Prepare: Arrange DTO and expected response
      const dto: CreateTransactionDto = {
        accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440000',
        accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
        tranferTypeId: 1,
        value: 500,
      };

      const expectedResponse = {
        transactionExternalId: 'transaction-123',
        transactionType: {
          name: 'Transfer',
        },
        transactionStatus: {
          name: 'pending',
        },
        value: 500,
        createdAt: new Date('2024-01-15T10:00:00Z'),
      };

      commandBus.execute.mockResolvedValue(expectedResponse);

      // Execute: Act
      const result = await controller.create(dto);

      // Validate: Assert
      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(CreateTransactionCommand),
      );

      const executedCommand = commandBus.execute.mock.calls[0][0] as CreateTransactionCommand;
      expect(executedCommand.accountExternalIdDebit).toBe(dto.accountExternalIdDebit);
      expect(executedCommand.accountExternalIdCredit).toBe(dto.accountExternalIdCredit);
      expect(executedCommand.transferTypeId).toBe(dto.tranferTypeId);
      expect(executedCommand.value).toBe(dto.value);

      expect(result).toEqual(expectedResponse);
    });

    it('debería manejar transacciones con valores altos', async () => {
      // Prepare: Arrange DTO with high value
      const dto: CreateTransactionDto = {
        accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440002',
        accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440003',
        tranferTypeId: 1,
        value: 2000,
      };

      const expectedResponse = {
        transactionExternalId: 'transaction-high-value',
        transactionType: {
          name: 'Transfer',
        },
        transactionStatus: {
          name: 'pending',
        },
        value: 2000,
        createdAt: new Date('2024-01-15T10:00:00Z'),
      };

      commandBus.execute.mockResolvedValue(expectedResponse);

      // Execute: Act
      const result = await controller.create(dto);

      // Validate: Assert
      const executedCommand = commandBus.execute.mock.calls[0][0] as CreateTransactionCommand;
      expect(executedCommand.value).toBe(2000);
      expect(result.value).toBe(2000);
    });

    it('debería propagar errores del CommandBus', async () => {
      // Prepare: Arrange error scenario
      const dto: CreateTransactionDto = {
        accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440000',
        accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
        tranferTypeId: 1,
        value: 500,
      };

      const error = new Error('Command execution failed');
      commandBus.execute.mockRejectedValue(error);

      // Execute & Validate: Act & Assert
      await expect(controller.create(dto)).rejects.toThrow('Command execution failed');
    });

    it('debería crear una transacción de tipo Payment', async () => {
      // Prepare: Arrange DTO for Payment type
      const dto: CreateTransactionDto = {
        accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440004',
        accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440005',
        tranferTypeId: 2, // Payment
        value: 300,
      };

      const expectedResponse = {
        transactionExternalId: 'transaction-payment',
        transactionType: {
          name: 'Payment',
        },
        transactionStatus: {
          name: 'pending',
        },
        value: 300,
        createdAt: new Date('2024-01-15T10:00:00Z'),
      };

      commandBus.execute.mockResolvedValue(expectedResponse);

      // Execute: Act
      const result = await controller.create(dto);

      // Validate: Assert
      const executedCommand = commandBus.execute.mock.calls[0][0] as CreateTransactionCommand;
      expect(executedCommand.transferTypeId).toBe(2);
      expect(result.transactionType.name).toBe('Payment');
    });
  });

  describe('getById', () => {
    it('debería obtener una transacción por su ID externo', async () => {
      // Prepare: Arrange transaction ID and expected response
      const transactionId = 'transaction-456';
      const expectedResponse = {
        transactionExternalId: transactionId,
        transactionType: {
          name: 'Transfer',
        },
        transactionStatus: {
          name: 'approved',
        },
        value: 750,
        createdAt: new Date('2024-01-15T10:00:00Z'),
      };

      queryBus.execute.mockResolvedValue(expectedResponse);

      // Execute: Act
      const result = await controller.getById(transactionId);

      // Validate: Assert
      expect(queryBus.execute).toHaveBeenCalledTimes(1);
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.any(GetTransactionQuery),
      );

      const executedQuery = queryBus.execute.mock.calls[0][0] as GetTransactionQuery;
      expect(executedQuery.transactionExternalId).toBe(transactionId);

      expect(result).toEqual(expectedResponse);
    });

    it('debería obtener una transacción con estado rejected', async () => {
      // Prepare: Arrange rejected transaction
      const transactionId = 'transaction-rejected-789';
      const expectedResponse = {
        transactionExternalId: transactionId,
        transactionType: {
          name: 'Transfer',
        },
        transactionStatus: {
          name: 'rejected',
        },
        value: 1500,
        createdAt: new Date('2024-01-15T10:00:00Z'),
      };

      queryBus.execute.mockResolvedValue(expectedResponse);

      // Execute: Act
      const result = await controller.getById(transactionId);

      // Validate: Assert
      expect(result.transactionStatus.name).toBe('rejected');
      expect(result.value).toBe(1500);
    });

    it('debería propagar errores del QueryBus cuando la transacción no existe', async () => {
      // Prepare: Arrange not found scenario
      const transactionId = 'non-existent-transaction';
      const error = new Error('Transaction not found');

      queryBus.execute.mockRejectedValue(error);

      // Execute & Validate: Act & Assert
      await expect(controller.getById(transactionId)).rejects.toThrow('Transaction not found');
    });

    it('debería manejar UUIDs válidos correctamente', async () => {
      // Prepare: Arrange valid UUID
      const validUuid = '550e8400-e29b-41d4-a716-446655440099';
      const expectedResponse = {
        transactionExternalId: validUuid,
        transactionType: {
          name: 'Withdrawal',
        },
        transactionStatus: {
          name: 'approved',
        },
        value: 250,
        createdAt: new Date('2024-01-15T10:00:00Z'),
      };

      queryBus.execute.mockResolvedValue(expectedResponse);

      // Execute: Act
      const result = await controller.getById(validUuid);

      // Validate: Assert
      const executedQuery = queryBus.execute.mock.calls[0][0] as GetTransactionQuery;
      expect(executedQuery.transactionExternalId).toBe(validUuid);
      expect(result.transactionExternalId).toBe(validUuid);
    });

    it('debería obtener transacciones en estado pending', async () => {
      // Prepare: Arrange pending transaction
      const transactionId = 'transaction-pending-101';
      const expectedResponse = {
        transactionExternalId: transactionId,
        transactionType: {
          name: 'Transfer',
        },
        transactionStatus: {
          name: 'pending',
        },
        value: 100,
        createdAt: new Date('2024-01-15T10:00:00Z'),
      };

      queryBus.execute.mockResolvedValue(expectedResponse);

      // Execute: Act
      const result = await controller.getById(transactionId);

      // Validate: Assert
      expect(result.transactionStatus.name).toBe('pending');
    });
  });
});
