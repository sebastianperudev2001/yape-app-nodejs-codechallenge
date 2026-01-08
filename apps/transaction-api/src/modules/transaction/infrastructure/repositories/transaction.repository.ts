import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

@Injectable()
export class TransactionRepository {
  private readonly logger = new Logger(TransactionRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    transactionExternalId: string;
    accountExternalIdDebit: string;
    accountExternalIdCredit: string;
    transferTypeId: number;
    value: number;
    transactionStatusId: number;
  }) {
    const transaction = await this.prisma.transaction.create({
      data: {
        transactionExternalId: data.transactionExternalId,
        accountExternalIdDebit: data.accountExternalIdDebit,
        accountExternalIdCredit: data.accountExternalIdCredit,
        transferTypeId: data.transferTypeId,
        value: data.value,
        transactionStatusId: data.transactionStatusId,
      },
      include: {
        transactionType: true,
        transactionStatus: true,
      },
    });

    this.logger.log(`Transaction created: ${transaction.transactionExternalId}`);
    return transaction;
  }

  async findByExternalId(externalId: string) {
    return this.prisma.transaction.findUnique({
      where: { transactionExternalId: externalId },
      include: {
        transactionType: true,
        transactionStatus: true,
      },
    });
  }

  async updateStatus(transactionExternalId: string, statusId: number) {
    const updated = await this.prisma.transaction.update({
      where: { transactionExternalId },
      data: { transactionStatusId: statusId },
      include: {
        transactionType: true,
        transactionStatus: true,
      },
    });

    this.logger.log(`Transaction ${transactionExternalId} status updated to ${updated.transactionStatus.name}`);
    return updated;
  }
}
