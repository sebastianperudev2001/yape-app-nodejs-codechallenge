export interface TransactionCreatedEvent {
  eventId: string;                    // UUID para idempotencia
  eventType: 'transaction.created';
  eventVersion: '1.0';
  timestamp: string;                  // ISO 8601
  correlationId: string;              // Para distributed tracing
  data: {
    transactionExternalId: string;
    accountExternalIdDebit: string;
    accountExternalIdCredit: string;
    transferTypeId: number;
    value: number;
    createdAt: string;
  };
}
