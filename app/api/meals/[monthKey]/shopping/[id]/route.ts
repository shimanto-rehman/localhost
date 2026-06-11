import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAptSession,
  requireMemberSession,
  jsonOk,
  jsonError,
  handleApiError,
} from '@/lib/api-helpers';

type Params = { params: Promise<{ monthKey: string; id: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const apt = await requireAptSession(req);
    const memberSession = await requireMemberSession(req);

    const entry = await prisma.mealShopping.findFirst({
      where: { id, apartmentId: apt.apartmentId },
    });
    if (!entry) return jsonOk({ success: true });

    const canDelete =
      entry.memberId === memberSession.memberId ||
      memberSession.isAdmin ||
      memberSession.isBillManager;
    if (!canDelete) return jsonError('Not allowed', 403);

    await prisma.mealShopping.delete({ where: { id } });
    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
