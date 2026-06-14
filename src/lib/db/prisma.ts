import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;

// Neon's serverless Postgres suspends its compute after a period of
// inactivity; the first query after a suspend can fail with P1001 ("Can't
// reach database server") while the compute wakes up. Retry once with a
// short delay so callers don't see a transient cold-start error.
export const prisma = basePrisma.$extends({
  query: {
    async $allOperations({ args, query }) {
      try {
        return await query(args);
      } catch (err) {
        const isUnreachable = err instanceof Error && err.message.includes('P1001');
        if (!isUnreachable) throw err;
        await new Promise((r) => setTimeout(r, 1000));
        return query(args);
      }
    },
  },
});
