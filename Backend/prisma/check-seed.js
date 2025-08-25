import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  const txCount = await prisma.transaction.count();
  const invCount = await prisma.investment.count();
  const receiptCount = await prisma.receipt.count();

  console.log(JSON.stringify({ userCount, txCount, invCount, receiptCount }, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
