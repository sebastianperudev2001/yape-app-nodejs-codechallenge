import { Test, TestingModule } from '@nestjs/testing';
import { TransactionValidatedHandler } from './transaction-validated.handler';
import { TransactionRepository } from '../../infrastructure/repositories/transaction.repository';
import { TransactionValidatedEvent } from '@yape/shared-types';

describe('TransactionValidatedHandler', () => {
  let handler: TransactionValidatedHandler;
  let repository: jest.Mocked<TransactionRepository>;

  beforeEach(async () => {
    // Prepare: Create mocks
    const mockRepository = {
      create: jest.fn(),
      findByExternalId: jest.fn(),
      updateStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionValidatedHandler,
        {
          provide: TransactionRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    handler = module.get<TransactionValidatedHandler>(TransactionValidatedHandler);
    repository = module.get(TransactionRepository) as jest.Mocked<TransactionRepository>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('debería actualizar el estado de la transacción a approved cuando el evento indica aprobación', async () => {
      // Prepare: Arrange approved transaction event
      const event: TransactionValidatedEvent = {
        eventId: 'event-123',
        eventType: 'transaction.validated',
        eventVersion: '1.0',
        timestamp: '2024-01-15T10:00:00Z',
        correlationId: 'correlation-123',
        data: {
          transactionExternalId: 'transaction-456',
          status: 'approved',
          validatedAt: '2024-01-15T10:00:00Z',
        },
      };

      repository.updateStatus.mockResolvedValue(undefined);

      // Execute: Act
      await handler.handle(event);

      // Validate: Assert
      expect(repository.updateStatus).toHaveBeenCalledTimes(1);
      expect(repository.updateStatus).toHaveBeenCalledWith(
        'transaction-456',
        2, // ID de estado "approved"
      );
    });

    it('debería actualizar el estado de la transacción a rejected cuando el evento indica rechazo', async () => {
      // Prepare: Arrange rejected transaction event
      const event: TransactionValidatedEvent = {
        eventId: 'event-789',
        eventType: 'transaction.validated',
        eventVersion: '1.0',
        timestamp: '2024-01-15T10:00:00Z',
        correlationId: 'correlation-789',
        data: {
          transactionExternalId: 'transaction-999',
          status: 'rejected',
          reason: 'Transaction amount 1500 exceeds threshold 1000',
          validatedAt: '2024-01-15T10:00:00Z',
        },
      };

      repository.updateStatus.mockResolvedValue(undefined);

      // Execute: Act
      await handler.handle(event);

      // Validate: Assert
      expect(repository.updateStatus).toHaveBeenCalledTimes(1);
      expect(repository.updateStatus).toHaveBeenCalledWith(
        'transaction-999',
        3, // ID de estado "rejected"
      );
    });

    it('debería propagar errores del repositorio', async () => {
      // Prepare: Arrange error scenario
      const event: TransactionValidatedEvent = {
        eventId: 'event-error',
        eventType: 'transaction.validated',
        eventVersion: '1.0',
        timestamp: '2024-01-15T10:00:00Z',
        correlationId: 'correlation-error',
        data: {
          transactionExternalId: 'transaction-error',
          status: 'approved',
          validatedAt: '2024-01-15T10:00:00Z',
        },
      };

      const dbError = new Error('Transaction not found');
      repository.updateStatus.mockRejectedValue(dbError);

      // Execute & Validate: Act & Assert
      await expect(handler.handle(event)).rejects.toThrow('Transaction not found');

      expect(repository.updateStatus).toHaveBeenCalledTimes(1);
    });

    it('debería manejar correctamente el mapeo de status approved a statusId 2', async () => {
      // Prepare: Arrange approved event
      const event: TransactionValidatedEvent = {
        eventId: 'event-mapping-approved',
        eventType: 'transaction.validated',
        eventVersion: '1.0',
        timestamp: '2024-01-15T10:00:00Z',
        correlationId: 'correlation-mapping',
        data: {
          transactionExternalId: 'transaction-mapping-approved',
          status: 'approved',
          validatedAt: '2024-01-15T10:00:00Z',
        },
      };

      repository.updateStatus.mockResolvedValue(undefined);

      // Execute: Act
      await handler.handle(event);

      // Validate: Assert
      const [transactionId, statusId] = repository.updateStatus.mock.calls[0];
      expect(transactionId).toBe('transaction-mapping-approved');
      expect(statusId).toBe(2); // approved
    });

    it('debería manejar correctamente el mapeo de status rejected a statusId 3', async () => {
      // Prepare: Arrange rejected event
      const event: TransactionValidatedEvent = {
        eventId: 'event-mapping-rejected',
        eventType: 'transaction.validated',
        eventVersion: '1.0',
        timestamp: '2024-01-15T10:00:00Z',
        correlationId: 'correlation-mapping-rejected',
        data: {
          transactionExternalId: 'transaction-mapping-rejected',
          status: 'rejected',
          reason: 'Amount exceeds limit',
          validatedAt: '2024-01-15T10:00:00Z',
        },
      };

      repository.updateStatus.mockResolvedValue(undefined);

      // Execute: Act
      await handler.handle(event);

      // Validate: Assert
      const [transactionId, statusId] = repository.updateStatus.mock.calls[0];
      expect(transactionId).toBe('transaction-mapping-rejected');
      expect(statusId).toBe(3); // rejected
    });

    it('debería manejar eventos con campo reason opcional', async () => {
      // Prepare: Arrange approved event without reason
      const eventWithoutReason: TransactionValidatedEvent = {
        eventId: 'event-no-reason',
        eventType: 'transaction.validated',
        eventVersion: '1.0',
        timestamp: '2024-01-15T10:00:00Z',
        correlationId: 'correlation-no-reason',
        data: {
          transactionExternalId: 'transaction-no-reason',
          status: 'approved',
          validatedAt: '2024-01-15T10:00:00Z',
        },
      };

      repository.updateStatus.mockResolvedValue(undefined);

      // Execute: Act
      await handler.handle(eventWithoutReason);

      // Validate: Assert
      expect(repository.updateStatus).toHaveBeenCalledWith('transaction-no-reason', 2);

      // Prepare: Arrange rejected event with reason
      const eventWithReason: TransactionValidatedEvent = {
        eventId: 'event-with-reason',
        eventType: 'transaction.validated',
        eventVersion: '1.0',
        timestamp: '2024-01-15T10:00:00Z',
        correlationId: 'correlation-with-reason',
        data: {
          transactionExternalId: 'transaction-with-reason',
          status: 'rejected',
          reason: 'Fraud detected',
          validatedAt: '2024-01-15T10:00:00Z',
        },
      };

      repository.updateStatus.mockResolvedValue(undefined);

      // Execute: Act
      await handler.handle(eventWithReason);

      // Validate: Assert
      expect(repository.updateStatus).toHaveBeenCalledWith('transaction-with-reason', 3);
    });
  });
});
