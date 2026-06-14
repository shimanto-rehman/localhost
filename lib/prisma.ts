import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/** Serverless-safe URL: one connection per function + pooler-friendly timeouts. */
function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return url;

  if (process.env.NODE_ENV !== 'production') return url;

  const params = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
  if (!params.has('connection_limit')) params.set('connection_limit', '1');
  if (!params.has('pool_timeout')) params.set('pool_timeout', '15');
  if (!params.has('connect_timeout')) params.set('connect_timeout', '10');

  const base = url.split('?')[0];
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: { url: getDatabaseUrl() },
    },
  });

// Reuse one client per serverless instance (critical on Vercel — avoids connection storms).
globalForPrisma.prisma = prisma;
