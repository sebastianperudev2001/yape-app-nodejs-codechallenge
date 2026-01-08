import { Module, Global } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { KafkaProducer } from './kafka.producer';
import { KafkaConsumer } from './kafka.consumer';

@Global()
@Module({
  imports: [CqrsModule],
  providers: [KafkaProducer, KafkaConsumer],
  exports: [KafkaProducer, KafkaConsumer],
})
export class KafkaModule {}
