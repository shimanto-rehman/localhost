import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { hashToken } from '@/lib/encryption';
import { sendPasswordResetEmail } from '@/lib/email';
import { requireAptSession, jsonOk, jsonError, handleApiError, logAudit } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const { memberId } = await req.json();
    if (!memberId) return jsonError('Member ID required', 400);

    const member = await prisma.member.findFirst({
      where: { id: memberId, apartmentId: apt.apartmentId },
    });
    if (!member?.email) {
      return jsonError('No email on file. Admin must reset password manually.', 400);
    }

    const token = crypto.randomBytes(32).toString('hex');
    await prisma.passwordResetToken.create({
      data: {
        memberId: member.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await sendPasswordResetEmail(member.email, member.name, token);
    await logAudit(apt.apartmentId, 'PASSWORD_RESET_REQUEST', undefined, 'member', member.id);

    return jsonOk({ success: true, message: 'Reset link sent if email is configured' });
  } catch (err) {
    return handleApiError(err);
  }
}
