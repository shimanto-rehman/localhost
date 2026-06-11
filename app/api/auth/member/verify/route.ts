import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMemberSessionFromRequest } from '@/lib/auth';
import { requireAptSession, jsonOk, jsonError, handleApiError } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    await requireAptSession(req);
    const session = await getMemberSessionFromRequest(req);
    if (!session) return jsonError('Not signed in', 401);

    const member = await prisma.member.findUnique({
      where: { id: session.memberId },
      select: { id: true, name: true, photoUrl: true, isActive: true },
    });
    if (!member || !member.isActive) return jsonError('Not signed in', 401);

    return jsonOk({
      member: {
        ...member,
        isAdmin: session.isAdmin,
        isBillManager: session.isBillManager,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
