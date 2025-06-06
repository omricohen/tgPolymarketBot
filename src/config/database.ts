// Database configuration with Prisma ORM
import { PrismaClient } from '@prisma/client';
// Declare global prisma instance
console.log('Database initialized1');
declare global {
    var prisma: PrismaClient | undefined;
}

// Create singleton instance
console.log('Database initialized2');
const prisma = 
    global.prisma || 
    new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
    });
global.prisma ||= prisma;
console.log('Database initialized3');
// Export the prisma instance
export { prisma };
