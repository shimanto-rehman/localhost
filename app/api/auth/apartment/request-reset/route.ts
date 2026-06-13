import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { hashToken } from '@/lib/encryption';
import { sendApartmentPasswordResetEmail } from '@/lib/email';
import { apartmentRequestResetSchema } from '@/lib/validation';
import { checkRateLimit, recordFailedAttempt, clearAttempts } from '@/lib/rate-limit';
import { jsonOk, jsonError, handleApiError, logAudit } from '@/lib/api-helpers';

const GENERIC_OK = {
  success: true,
  message: 'If a matching apartment was found, a reset link was sent to the registrant email.',
};

function getRequestOrigin(req: NextRequest): string {
  const origin = req.headers.get('origin');
  if (origin) return origin.replace(/\/$/, '');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateKey = `apt-reset:${ip}`;
    const rate = await checkRateLimit(rateKey, 5, 10 * 60 * 1000, 15 * 60 * 1000);
    if (!rate.allowed) {
      return jsonError(`Too many attempts. Try again in ${rate.retryAfter}s`, 429);
    }

    const body = await req.json();
    const parsed = apartmentRequestResetSchema.safeParse(body);
    if (!parsed.success) return jsonOk(GENERIC_OK);

    const { identifier, email } = parsed.data;
    const apartment = await prisma.apartment.findFirst({
      where: {
        registrantEmail: { equals: email, mode: 'insensitive' },
        OR: [{ name: identifier }, { registrationId: identifier }],
      },
    });

    if (!apartment) {
      await recordFailedAttempt(rateKey, 5, 15 * 60 * 1000);
      return jsonOk(GENERIC_OK);
    }

    await prisma.apartmentPasswordResetToken.deleteMany({
      where: { apartmentId: apartment.id, usedAt: null },
    });

    const token = crypto.randomBytes(32).toString('hex');
    await prisma.apartmentPasswordResetToken.create({
      data: {
        apartmentId: apartment.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const emailSent = await sendApartmentPasswordResetEmail(
      apartment.registrantEmail,
      apartment.registrantName,
      apartment.name,
      token,
    );
    await logAudit(apartment.id, 'APARTMENT_PASSWORD_RESET_REQUEST', undefined, 'apartment', apartment.id);
    await clearAttempts(rateKey);

    if (emailSent) {
      return jsonOk({
        success: true,
        message: 'Reset link sent to your registrant email.',
        emailSent: true,
      });
    }

    const resetUrl = `${getRequestOrigin(req)}/reset-apartment-password/${token}`;
    if (process.env.NODE_ENV === 'development') {
      return jsonOk({
        success: true,
        message: 'Email is not configured on this server. Use the reset link below.',
        emailSent: false,
        devResetUrl: resetUrl,
      });
    }

    console.warn(`Email not configured — apartment password reset link for ${apartment.name}:`, resetUrl);
    return jsonOk({
      success: true,
      message: 'We could not send the email. Please ask your server admin to configure email delivery.',
      emailSent: false,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
