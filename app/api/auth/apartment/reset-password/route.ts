import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashToken } from '@/lib/encryption';
import { hashPassword, validatePasswordStrength } from '@/lib/password';
import { jsonOk, jsonError, handleApiError, logAudit } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  try {
    const { token, password, confirmPassword } = await req.json();
    if (!token || !password) return jsonError('Token and password required', 400);
    if (password !== confirmPassword) return jsonError('Passwords do not match', 400);

    const strengthErr = validatePasswordStrength(password);
    if (strengthErr) return jsonError(strengthErr, 400);

    const resetToken = await prisma.apartmentPasswordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { apartment: true },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return jsonError('Invalid or expired reset link', 400);
    }

    const passwordHash = await hashPassword(password);
    await prisma.$transaction([
      prisma.apartment.update({
        where: { id: resetToken.apartmentId },
        data: { passwordHash },
      }),
      prisma.apartmentPasswordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await logAudit(
      resetToken.apartmentId,
      'APARTMENT_PASSWORD_RESET',
      undefined,
      'apartment',
      resetToken.apartmentId,
    );

    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
