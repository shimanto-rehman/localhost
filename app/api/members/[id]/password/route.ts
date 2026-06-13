import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, validateMemberPassword } from '@/lib/password';
import {
  requireAptSession,
  requireMemberSession,
  requirePermission,
  jsonOk,
  jsonError,
  handleApiError,
  logAudit,
} from '@/lib/api-helpers';

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const apt = await requireAptSession(req);
    const memberSession = await requireMemberSession(req);
    await requirePermission(memberSession, 'reset_passwords');

    const { password } = await req.json();
    const pwdErr = validateMemberPassword(password);
    if (pwdErr) return jsonError(pwdErr, 400);

    const member = await prisma.member.findFirst({
      where: { id, apartmentId: apt.apartmentId },
    });
    if (!member) return jsonError('Member not found', 404);

    await prisma.member.update({
      where: { id },
      data: { passwordHash: await hashPassword(password) },
    });

    await logAudit(apt.apartmentId, 'PASSWORD_SET_BY_ADMIN', memberSession.memberId, 'member', id);
    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
