import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Transaction Types
  await prisma.transactionType.createMany({
    data: [
      { id: 1, name: 'Transfer', description: 'Money transfer' },
      { id: 2, name: 'Payment', description: 'Payment transaction' },
      { id: 3, name: 'Withdrawal', description: 'Cash withdrawal' },
    ],
    skipDuplicates: true,
  });
  console.log('Transaction types created');

  // Transaction Statuses
  await prisma.transactionStatus.createMany({
    data: [
      { id: 1, name: 'pending', description: 'Pending validation' },
      { id: 2, name: 'approved', description: 'Approved by anti-fraud' },
      { id: 3, name: 'rejected', description: 'Rejected by anti-fraud' },
    ],
    skipDuplicates: true,
  });
  console.log('Transaction statuses created');

  console.log('Database seeded successfully');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
