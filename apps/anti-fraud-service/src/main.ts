import { NestFactory } from '@nestjs/factory';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('AntiFraudService');
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`Anti-Fraud Service is running on: http://localhost:${port}`);
  logger.log(`Listening to Kafka topic: transaction.created`);
}

bootstrap();
