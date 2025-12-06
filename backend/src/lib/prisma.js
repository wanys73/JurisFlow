import { PrismaClient } from '@prisma/client';

// Singleton pattern pour Prisma Client
const globalForPrisma = global;

export const prisma = globalForPrisma.prisma || new PrismaClient({
  // Désactiver les logs de requêtes pour voir nos console.log() de débogage
  // Réactiver avec ['query', 'error', 'warn'] si besoin de déboguer les requêtes SQL
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;

