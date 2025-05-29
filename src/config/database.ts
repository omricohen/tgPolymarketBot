// Database configuration with Prisma ORM
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

// Singleton pattern for PrismaClient in serverless environments to prevent multiple connections
if (process.env.NODE_ENV === 'production') {
  if (!(global as any).prisma) {
    (global as any).prisma = new PrismaClient();
  }
  prisma = (global as any).prisma;
} else {
  prisma = new PrismaClient();
}

export { prisma };