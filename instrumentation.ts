/** Warm Prisma on cold starts so the first API request doesn't pay full connect latency. */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { prisma } = await import('./lib/prisma');
    try {
      await prisma.$connect();
    } catch (err) {
      console.error('[instrumentation] Prisma connect failed:', err);
    }
  }
}
