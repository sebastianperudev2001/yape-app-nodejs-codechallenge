import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { CqrsModule } from '@nestjs/cqrs';
import configuration from './config/configuration';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { KafkaModule } from './infrastructure/messaging/kafka.module';
import { TransactionModule } from './modules/transaction/transaction.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // GraphQL
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: true,
      context: ({ req }) => ({ req }),
    }),

    // CQRS
    CqrsModule,

    // Infrastructure
    PrismaModule,
    KafkaModule,

    // Business modules
    TransactionModule,
  ],
})
export class AppModule {}
