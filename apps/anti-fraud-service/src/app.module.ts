import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { FraudDetectionModule } from './modules/fraud-detection/fraud-detection.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    FraudDetectionModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
