import { PrismaClient } from '@prisma/client'
import { PrismaClient as PostgresClient } from '@prisma/postgres-client'
import { databaseConfig } from './database-config'

const config = databaseConfig(process.env.DATABASE_URL, process.env.VERCEL === '1');
process.env.DATABASE_URL = config.url;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  // Both clients are generated from identical models. Keep one application API.
  (config.provider === 'postgresql'
    ? new PostgresClient({ datasources: { db: { url: config.url } } }) as unknown as PrismaClient
    : new PrismaClient({ datasources: { db: { url: config.url } } }))

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
