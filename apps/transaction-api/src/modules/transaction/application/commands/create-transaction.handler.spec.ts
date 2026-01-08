import { Test, TestingModule } from '@nestjs/testing';
import { CreateTransactionHandler, CreateTransactionCommand } from './create-transaction.handler';
import { TransactionRepository } from '../../infrastructure/repositories/transaction.repository';
import { KafkaProducer } from '../../../../infrastructure/messaging/kafka.producer';
import { TransactionCreatedEvent } from '@yape/shared-types';

describe('CreateTransactionHandler', () => {
  let handler: CreateTransactionHandler;
  let repository: jest.Mocked<TransactionRepository>;
  let kafkaProducer: jest.Mocked<KafkaProducer>;

  beforeEach(async () => {
    // Prepare: Create mocks
    const mockRepository = {
      create: jest.fn(),
      findByExternalId: jest.fn(),
      updateStatus: jest.fn(),
    };

    const mockKafkaProducer = {
      send: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateTransactionHandler,
        {
          provide: TransactionRepository,
          useValue: mockRepository,
        },
        {
          provide: KafkaProducer,
          useValue: mockKafkaProducer,
        },
      ],
    }).compile();

    handler = module.get<CreateTransactionHandler>(CreateTransactionHandler);
    repository = module.get(TransactionRepository) as jest.Mocked<TransactionRepository>;
    kafkaProducer = module.get(KafkaProducer) as jest.Mocked<KafkaProducer>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('debería crear una transacción con estado pending y publicar evento a Kafka', async () => {
      // Prepare: Arrange test data
      const command = new CreateTransactionCommand(
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440001',
        1,
        500,
      );

      const mockTransaction = {
        transactionExternalId: 'mock-uuid-transaction',
        accountExternalIdDebit: command.accountExternalIdDebit,
        accountExternalIdCredit: command.accountExternalIdCredit,
        transferTypeId: command.transferTypeId,
        value: command.value,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        transactionType: {
          name: 'Transfer',
        },
        transactionStatus: {
          name: 'pending',
        },
      };

      repository.create.mockResolvedValue(mockTransaction as any);
      kafkaProducer.send.mockResolvedValue(undefined);

      // Execute: Act
      const result = await handler.execute(command);

      // Validate: Assert
      // Verificar que se llamó al repositorio con los datos correctos
      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accountExternalIdDebit: command.accountExternalIdDebit,
          accountExternalIdCredit: command.accountExternalIdCredit,
          transferTypeId: command.transferTypeId,
          value: command.value,
          transactionStatusId: 1, // pending
        }),
      );

      // Verificar que se publicó el evento a Kafka
      expect(kafkaProducer.send).toHaveBeenCalledTimes(1);
      expect(kafkaProducer.send).toHaveBeenCalledWith(
        'transaction.created',
        expect.objectContaining({
          eventType: 'transaction.created',
          eventVersion: '1.0',
          data: expect.objectContaining({
            transactionExternalId: mockTransaction.transactionExternalId,
            accountExternalIdDebit: command.accountExternalIdDebit,
            accountExternalIdCredit: command.accountExternalIdCredit,
            transferTypeId: command.transferTypeId,
            value: command.value,
          }),
        }),
      );

      // Verificar la respuesta
      expect(result).toEqual({
        transactionExternalId: mockTransaction.transactionExternalId,
        transactionType: {
          name: 'Transfer',
        },
        transactionStatus: {
          name: 'pending',
        },
        value: 500,
        createdAt: mockTransaction.createdAt,
      });
    });

    it('debería manejar transacciones con valores grandes correctamente', async () => {
      // Prepare: Arrange test data with high value
      const command = new CreateTransactionCommand(
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440001',
        1,
        1500, // Valor mayor a 1000
      );

      const mockTransaction = {
        transactionExternalId: 'mock-uuid-high-value',
        accountExternalIdDebit: command.accountExternalIdDebit,
        accountExternalIdCredit: command.accountExternalIdCredit,
        transferTypeId: command.transferTypeId,
        value: command.value,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        transactionType: {
          name: 'Transfer',
        },
        transactionStatus: {
          name: 'pending',
        },
      };

      repository.create.mockResolvedValue(mockTransaction as any);
      kafkaProducer.send.mockResolvedValue(undefined);

      // Execute: Act
      const result = await handler.execute(command);

      // Validate: Assert
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 1500,
        }),
      );

      expect(result.value).toBe(1500);
    });

    it('debería propagar errores del repositorio', async () => {
      // Prepare: Arrange error scenario
      const command = new CreateTransactionCommand(
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440001',
        1,
        500,
      );

      const dbError = new Error('Database connection failed');
      repository.create.mockRejectedValue(dbError);

      // Execute & Validate: Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Database connection failed');

      // Verificar que Kafka no se llamó si falla el repositorio
      expect(kafkaProducer.send).not.toHaveBeenCalled();
    });

    it('debería propagar errores de Kafka producer', async () => {
      // Prepare: Arrange Kafka error scenario
      const command = new CreateTransactionCommand(
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440001',
        1,
        500,
      );

      const mockTransaction = {
        transactionExternalId: 'mock-uuid-kafka-error',
        accountExternalIdDebit: command.accountExternalIdDebit,
        accountExternalIdCredit: command.accountExternalIdCredit,
        transferTypeId: command.transferTypeId,
        value: command.value,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        transactionType: {
          name: 'Transfer',
        },
        transactionStatus: {
          name: 'pending',
        },
      };

      repository.create.mockResolvedValue(mockTransaction as any);
      const kafkaError = new Error('Kafka broker not available');
      kafkaProducer.send.mockRejectedValue(kafkaError);

      // Execute & Validate: Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Kafka broker not available');

      // Verificar que el repositorio sí se llamó
      expect(repository.create).toHaveBeenCalledTimes(1);
    });

    it('debería incluir eventId y correlationId en el evento publicado', async () => {
      // Prepare: Arrange test data
      const command = new CreateTransactionCommand(
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440001',
        1,
        500,
      );

      const mockTransaction = {
        transactionExternalId: 'mock-uuid-event-ids',
        accountExternalIdDebit: command.accountExternalIdDebit,
        accountExternalIdCredit: command.accountExternalIdCredit,
        transferTypeId: command.transferTypeId,
        value: command.value,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        transactionType: {
          name: 'Transfer',
        },
        transactionStatus: {
          name: 'pending',
        },
      };

      repository.create.mockResolvedValue(mockTransaction as any);
      kafkaProducer.send.mockResolvedValue(undefined);

      // Execute: Act
      await handler.execute(command);

      // Validate: Assert
      const publishedEvent = kafkaProducer.send.mock.calls[0][1] as TransactionCreatedEvent;

      expect(publishedEvent.eventId).toBeDefined();
      expect(publishedEvent.eventId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

      expect(publishedEvent.correlationId).toBeDefined();
      expect(publishedEvent.correlationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

      expect(publishedEvent.timestamp).toBeDefined();
      expect(new Date(publishedEvent.timestamp)).toBeInstanceOf(Date);
    });
  });
});
