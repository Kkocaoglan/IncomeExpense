import { PrismaClient } from '@prisma/client';
import { hashPasswordWithPepper } from '../src/lib/passwordUtils.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding starting...');

  // 1) Admin User
  const adminPasswordHash = await hashPasswordWithPepper('Admin123456!');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      passwordHash: adminPasswordHash,
      emailVerifiedAt: new Date(),
      role: 'ADMIN',
    },
    create: {
      email: 'admin@example.com',
      name: 'Admin Kullanıcı',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      emailVerifiedAt: new Date(),
    },
  });

  // 2) Demo User
  const passwordHash = await hashPasswordWithPepper('P@ssw0rd12!');
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {
      passwordHash: passwordHash,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: 'demo@example.com',
      name: 'Demo Kullanıcı',
      passwordHash: passwordHash,
      emailVerifiedAt: new Date(),
    },
  });

  // 2) Transactions
  await prisma.transaction.createMany({
    data: [
      {
        userId: user.id,
        type: 'income',
        amount: 15000.00,
        currency: 'TRY',
        category: 'maas',
        date: new Date(),
        merchant: 'Şirket',
        description: 'Maaş',
        tags: ['gelir', 'maas'],
      },
      {
        userId: user.id,
        type: 'expense',
        amount: 750.50,
        currency: 'TRY',
        category: 'market',
        date: new Date(),
        merchant: 'Migros',
        description: 'Market alışverişi',
        tags: ['gider', 'market'],
      },
    ],
  });

  // 3) Investment
  await prisma.investment.create({
    data: {
      userId: user.id,
      assetType: 'gold',
      amount: 3.0,
      unitPrice: 2500.123456,
      currency: 'TRY',
      date: new Date(),
      notes: 'Örnek altın yatırımı',
    },
  });

  // 4) Receipt
  await prisma.receipt.create({
    data: {
      userId: user.id,
      fileRef: 'uploads/example.jpg',
      ocrJson: { mock: true, lines: 10 },
      total: 750.50,
      tax: 0,
      merchant: 'Migros',
      date: new Date(),
    },
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
