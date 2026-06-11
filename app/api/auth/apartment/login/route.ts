import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { createAptToken, setAptCookie } from '@/lib/auth';
import { apartmentLoginSchema } from '@/lib/validation';
import { checkRateLimit, recordFailedAttempt, clearAttempts } from '@/lib/rate-limit';
import { jsonOk, jsonError, handleApiError } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateKey = `apt:${ip}`;
    const rate = await checkRateLimit(rateKey, 5, 10 * 60 * 1000, 15 * 60 * 1000);
    if (!rate.allowed) {
      return jsonError(`Too many attempts. Try again in ${rate.retryAfter}s`, 429);
    }

    const body = await req.json();
    const parsed = apartmentLoginSchema.safeParse(body);
    if (!parsed.success) return jsonError('Invalid apartment credentials', 401);

    const { identifier, password } = parsed.data;
    const apartment = await prisma.apartment.findFirst({
      where: {
        OR: [{ name: identifier }, { registrationId: identifier }],
      },
    });

    if (!apartment || !(await verifyPassword(password, apartment.passwordHash))) {
      const fail = await recordFailedAttempt(rateKey, 5, 15 * 60 * 1000);
      if (fail.locked) {
        return jsonError(`Too many attempts. Try again in ${fail.retryAfter}s`, 429);
      }
      return jsonError('Invalid apartment credentials', 401);
    }

    await clearAttempts(rateKey);
    const token = await createAptToken(apartment.id);
    const response = jsonOk({ apartmentId: apartment.id, redirect: '/dashboard' });
    setAptCookie(response, token);
    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
