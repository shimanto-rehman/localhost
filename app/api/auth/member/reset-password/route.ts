import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashToken } from '@/lib/encryption';
import { hashPassword, validateMemberPassword } from '@/lib/password';
import { jsonOk, jsonError, handleApiError, logAudit } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  try {
    const { token, password, confirmPassword } = await req.json();
    if (!token || !password) return jsonError('Token and password required', 400);
    if (password !== confirmPassword) return jsonError('Passwords do not match', 400);

    const pwdErr = validateMemberPassword(password);
    if (pwdErr) return jsonError(pwdErr, 400);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { member: true },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return jsonError('Invalid or expired reset link', 400);
    }

    const passwordHash = await hashPassword(password);
    await prisma.$transaction([
      prisma.member.update({
        where: { id: resetToken.memberId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await logAudit(
      resetToken.member.apartmentId,
      'PASSWORD_RESET',
      resetToken.memberId,
      'member',
      resetToken.memberId
    );

    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
