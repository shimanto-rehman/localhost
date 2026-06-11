import { prisma } from './prisma';

export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
  lockMs: number
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = new Date();
  const record = await prisma.loginAttempt.findUnique({ where: { key } });

  if (record?.lockedUntil && record.lockedUntil > now) {
    return { allowed: false, retryAfter: Math.ceil((record.lockedUntil.getTime() - now.getTime()) / 1000) };
  }

  if (!record) {
    await prisma.loginAttempt.create({ data: { key, attempts: 0 } });
    return { allowed: true };
  }

  if (record.lockedUntil && record.lockedUntil <= now) {
    await prisma.loginAttempt.update({
      where: { key },
      data: { attempts: 0, lockedUntil: null },
    });
    return { allowed: true };
  }

  return { allowed: true };
}

export async function recordFailedAttempt(
  key: string,
  maxAttempts: number,
  lockMs: number
): Promise<{ locked: boolean; retryAfter?: number }> {
  const record = await prisma.loginAttempt.upsert({
    where: { key },
    create: { key, attempts: 1 },
    update: { attempts: { increment: 1 } },
  });

  if (record.attempts >= maxAttempts) {
    const lockedUntil = new Date(Date.now() + lockMs);
    await prisma.loginAttempt.update({
      where: { key },
      data: { lockedUntil, attempts: 0 },
    });
    return { locked: true, retryAfter: Math.ceil(lockMs / 1000) };
  }

  return { locked: false };
}

export async function clearAttempts(key: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { key } });
}
