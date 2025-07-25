
import { PrismaClient } from '@prisma/client';

// Create a global variable to store the Prisma client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create a singleton Prisma client
export const prisma = globalForPrisma.prisma ?? 
  new PrismaClient({
    log: ['error'],
  });

// In development, store the client on the global object to prevent creating multiple instances
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
