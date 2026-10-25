import { PrismaClient } from '@prisma/client'
import { PrismaClient as PostgresClient } from '@prisma/postgres-client'
import { databaseConfig } from './database-config'

let config: { provider: "sqlite" | "postgresql"; url: string } | null = null;
try {
  config = databaseConfig(process.env.DATABASE_URL, process.env.VERCEL === '1');
  process.env.DATABASE_URL = config.url;
} catch (err) {
  // Hosted environment without Postgres or local without config
  config = null;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | null | undefined
}

export const db: PrismaClient | null =
  globalForPrisma.prisma ??
  // Both clients are generated from identical models. Keep one application API.
  (config
    ? (config.provider === 'postgresql'
        ? (new PostgresClient({ datasources: { db: { url: config.url } } }) as unknown as PrismaClient)
        : new PrismaClient({ datasources: { db: { url: config.url } } }))
    : null);

if (process.env.NODE_ENV !== 'production' && db) globalForPrisma.prisma = db

