import { Module } from '@nestjs/common';
import { FraudDetectionService } from './services/fraud-detection.service';
import { TransactionCreatedConsumer } from './consumers/transaction-created.consumer';
import { KafkaProducer } from '../../infrastructure/messaging/kafka.producer';

@Module({
  providers: [FraudDetectionService, TransactionCreatedConsumer, KafkaProducer],
})
export class FraudDetectionModule {}
