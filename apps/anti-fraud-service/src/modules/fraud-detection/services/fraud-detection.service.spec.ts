import { Test, TestingModule } from '@nestjs/testing';
import { FraudDetectionService } from './fraud-detection.service';
import { KafkaProducer } from '../../../infrastructure/messaging/kafka.producer';
import { TransactionCreatedEvent, TransactionValidatedEvent } from '@yape/shared-types';

describe('FraudDetectionService', () => {
  let service: FraudDetectionService;
  let kafkaProducer: jest.Mocked<KafkaProducer>;

  beforeEach(async () => {
    // Prepare: Create mocks
    const mockKafkaProducer = {
      send: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FraudDetectionService,
        {
          provide: KafkaProducer,
          useValue: mockKafkaProducer,
        },
      ],
    }).compile();

    service = module.get<FraudDetectionService>(FraudDetectionService);
    kafkaProducer = module.get(KafkaProducer) as jest.Mocked<KafkaProducer>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateTransaction', () => {
    it('debería aprobar transacciones con valor menor o igual a 1000', async () => {
      // Prepare: Arrange transaction with value <= 1000
      const event: TransactionCreatedEvent = {
        eventId: 'event-approved',
        eventType: 'transaction.created',
        eventVersion: '1.0',
        timestamp: '2024-01-15T10:00:00Z',
        correlationId: 'correlation-approved',
        data: {
          transactionExternalId: 'transaction-approved',
          accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440000',
          accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
          transferTypeId: 1,
          value: 500,
          createdAt: '2024-01-15T10:00:00Z',
        },
      };

      kafkaProducer.send.mockResolvedValue(undefined);

      // Execute: Act
      await service.validateTransaction(event);

      // Validate: Assert
      expect(kafkaProducer.send).toHaveBeenCalledTimes(1);
      expect(kafkaProducer.send).toHaveBeenCalledWith(
        'transaction.validated',
        expect.objectContaining({
          eventType: 'transaction.validated',
          correlationId: 'correlation-approved',
          data: expect.objectContaining({
            transactionExternalId: 'transaction-approved',
            status: 'approved',
            reason: undefined,
          }),
        }),
      );
    });

    it('debería aprobar transacciones con valor exactamente igual a 1000', async () => {
      // Prepare: Arrange transaction with value = 1000 (boundary case)
      const event: TransactionCreatedEvent = {
        eventId: 'event-boundary',
        eventType: 'transaction.created',
        eventVersion: '1.0',
        timestamp: '2024-01-15T10:00:00Z',
        correlationId: 'correlation-boundary',
        data: {
          transactionExternalId: 'transaction-boundary',
          accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440000',
          accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
          transferTypeId: 1,
          value: 1000,
          createdAt: '2024-01-15T10:00:00Z',
        },
      };

      kafkaProducer.send.mockResolvedValue(undefined);

      // Execute: Act
      await service.validateTransaction(event);

      // Validate: Assert
      const publishedEvent = kafkaProducer.send.mock.calls[0][1] as TransactionValidatedEvent;
      expect(publishedEvent.data.status).toBe('approved');
      expect(publishedEvent.data.reason).toBeUndefined();
    });

    it('debería rechazar transacciones con valor mayor a 1000', async () => {
      // Prepare: Arrange transaction with value > 1000
      const event: TransactionCreatedEvent = {
        eventId: 'event-rejected',
        eventType: 'transaction.created',
        eventVersion: '1.0',
        timestamp: '2024-01-15T10:00:00Z',
        correlationId: 'correlation-rejected',
        data: {
          transactionExternalId: 'transaction-rejected',
          accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440002',
          accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440003',
          transferTypeId: 1,
          value: 1500,
          createdAt: '2024-01-15T10:00:00Z',
        },
      };

      kafkaProducer.send.mockResolvedValue(undefined);

      // Execute: Act
      await service.validateTransaction(event);

      // Validate: Assert
      expect(kafkaProducer.send).toHaveBeenCalledTimes(1);
      expect(kafkaProducer.send).toHaveBeenCalledWith(
        'transaction.validated',
        expect.objectContaining({
          eventType: 'transaction.validated',
          correlationId: 'correlation-rejected',
          data: expect.objectContaining({
            transactionExternalId: 'transaction-rejected',
            status: 'rejected',
            reason: 'Transaction amount 1500 exceeds threshold 1000',
          }),
        }),
      );
    });

    it('debería rechazar transacciones con valor inmediatamente superior a 1000', async () => {
      // Prepare: Arrange transaction with value = 1001 (boundary case)
      const event: TransactionCreatedEvent = {
        eventId: 'event-boundary-rejected',
        eventType: 'transaction.created',
        eventVersion: '1.0',
        timestamp: '2024-01-15T10:00:00Z',
        correlationId: 'correlation-boundary-rejected',
        data: {
          transactionExternalId: 'transaction-boundary-rejected',
          accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440004',
          accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440005',
          transferTypeId: 1,
          value: 1001,
          createdAt: '2024-01-15T10:00:00Z',
        },
      };

      kafkaProducer.send.mockResolvedValue(undefined);

      // Execute: Act
      await service.validateTransaction(event);

      // Validate: Assert
      const publishedEvent = kafkaProducer.send.mock.calls[0][1] as TransactionValidatedEvent;
      expect(publishedEvent.data.status).toBe('rejected');
      expect(publishedEvent.data.reason).toBe('Transaction amount 1001 exceeds threshold 1000');
    });

    it('debería incluir eventId y timestamp en el evento publicado', async () => {
      // Prepare: Arrange transaction
      const event: TransactionCreatedEvent = {
        eventId: 'event-metadata',
        eventType: 'transaction.created',
        eventVersion: '1.0',
        timestamp: '2024-01-15T10:00:00Z',
        correlationId: 'correlation-metadata',
        data: {
          transactionExternalId: 'transaction-metadata',
          accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440000',
          accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
          transferTypeId: 1,
          value: 750,
          createdAt: '2024-01-15T10:00:00Z',
        },
      };

      kafkaProducer.send.mockResolvedValue(undefined);

      // Execute: Act
      await service.validateTransaction(event);

      // Validate: Assert
      const publishedEvent = kafkaProducer.send.mock.calls[0][1] as TransactionValidatedEvent;

      expect(publishedEvent.eventId).toBeDefined();
      expect(publishedEvent.eventId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

      expect(publishedEvent.timestamp).toBeDefined();
      expect(new Date(publishedEvent.timestamp)).toBeInstanceOf(Date);

      expect(publishedEvent.eventVersion).toBe('1.0');
    });

    it('debería preservar el correlationId del evento original', async () => {
      // Prepare: Arrange transaction with specific correlationId
      const originalCorrelationId = 'correlation-preserve-test';
      const event: TransactionCreatedEvent = {
        eventId: 'event-correlation',
        eventType: 'transaction.created',
        eventVersion: '1.0',
        timestamp: '2024-01-15T10:00:00Z',
        correlationId: originalCorrelationId,
        data: {
          transactionExternalId: 'transaction-correlation',
          accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440000',
          accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
          transferTypeId: 1,
          value: 300,
          createdAt: '2024-01-15T10:00:00Z',
        },
      };

      kafkaProducer.send.mockResolvedValue(undefined);

      // Execute: Act
      await service.validateTransaction(event);

      // Validate: Assert
      const publishedEvent = kafkaProducer.send.mock.calls[0][1] as TransactionValidatedEvent;
      expect(publishedEvent.correlationId).toBe(originalCorrelationId);
    });

    it('debería propagar errores del KafkaProducer', async () => {
      // Prepare: Arrange Kafka error scenario
      const event: TransactionCreatedEvent = {
        eventId: 'event-kafka-error',
        eventType: 'transaction.created',
        eventVersion: '1.0',
        timestamp: '2024-01-15T10:00:00Z',
        correlationId: 'correlation-kafka-error',
        data: {
          transactionExternalId: 'transaction-kafka-error',
          accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440000',
          accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
          transferTypeId: 1,
          value: 500,
          createdAt: '2024-01-15T10:00:00Z',
        },
      };

      const kafkaError = new Error('Failed to send message to Kafka');
      kafkaProducer.send.mockRejectedValue(kafkaError);

      // Execute & Validate: Act & Assert
      await expect(service.validateTransaction(event)).rejects.toThrow('Failed to send message to Kafka');
    });

    it('debería incluir validatedAt timestamp en el evento de validación', async () => {
      // Prepare: Arrange transaction
      const beforeValidation = new Date();

      const event: TransactionCreatedEvent = {
        eventId: 'event-validated-at',
        eventType: 'transaction.created',
        eventVersion: '1.0',
        timestamp: '2024-01-15T10:00:00Z',
        correlationId: 'correlation-validated-at',
        data: {
          transactionExternalId: 'transaction-validated-at',
          accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440000',
          accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
          transferTypeId: 1,
          value: 250,
          createdAt: '2024-01-15T10:00:00Z',
        },
      };

      kafkaProducer.send.mockResolvedValue(undefined);

      // Execute: Act
      await service.validateTransaction(event);

      const afterValidation = new Date();

      // Validate: Assert
      const publishedEvent = kafkaProducer.send.mock.calls[0][1] as TransactionValidatedEvent;

      expect(publishedEvent.data.validatedAt).toBeDefined();
      const validatedAt = new Date(publishedEvent.data.validatedAt);
      expect(validatedAt).toBeInstanceOf(Date);
      expect(validatedAt.getTime()).toBeGreaterThanOrEqual(beforeValidation.getTime());
      expect(validatedAt.getTime()).toBeLessThanOrEqual(afterValidation.getTime());
    });

    it('debería manejar transacciones con valores decimales', async () => {
      // Prepare: Arrange transaction with decimal value
      const event: TransactionCreatedEvent = {
        eventId: 'event-decimal',
        eventType: 'transaction.created',
        eventVersion: '1.0',
        timestamp: '2024-01-15T10:00:00Z',
        correlationId: 'correlation-decimal',
        data: {
          transactionExternalId: 'transaction-decimal',
          accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440000',
          accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
          transferTypeId: 1,
          value: 999.99,
          createdAt: '2024-01-15T10:00:00Z',
        },
      };

      kafkaProducer.send.mockResolvedValue(undefined);

      // Execute: Act
      await service.validateTransaction(event);

      // Validate: Assert
      const publishedEvent = kafkaProducer.send.mock.calls[0][1] as TransactionValidatedEvent;
      expect(publishedEvent.data.status).toBe('approved');
    });
  });
});
