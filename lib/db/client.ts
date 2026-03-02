/**
 * Prisma Client Singleton
 * 
 * Single source of truth for Prisma client instance.
 * All database operations MUST import from this file.
 */
import { PrismaClient } from '../../generated/prisma';

// Singleton pattern to prevent multiple instances
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Re-export types for convenience
export { CustomerStatus, Prisma } from '../../generated/prisma';
export type { Customer, Tenant, SalesStateHistory } from '../../generated/prisma';
