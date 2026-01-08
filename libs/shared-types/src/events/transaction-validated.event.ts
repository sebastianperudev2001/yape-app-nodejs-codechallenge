export class TransactionValidatedEvent {
  eventId: string;
  eventType: 'transaction.validated';
  eventVersion: '1.0';
  timestamp: string;
  correlationId: string;
  data: {
    transactionExternalId: string;
    status: 'approved' | 'rejected';
    reason?: string;
    validatedAt: string;
  };

  constructor(partial: Partial<TransactionValidatedEvent> = {}) {
    Object.assign(this, partial);
  }
}
