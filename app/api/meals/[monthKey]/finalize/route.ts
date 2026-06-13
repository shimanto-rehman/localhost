import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMealSummary } from '@/lib/meal-summary';
import {
  requireAptSession,
  requireMemberSession,
  requireBillManagerOrAdmin,
  requirePermission,
  jsonOk,
  handleApiError,
} from '@/lib/api-helpers';

type Params = { params: Promise<{ monthKey: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { monthKey } = await params;
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    await requirePermission(member, 'finalize_meals');

    const summary = await getMealSummary(apt.apartmentId, monthKey);

    const mealMonth = await prisma.mealMonth.upsert({
      where: { apartmentId_monthKey: { apartmentId: apt.apartmentId, monthKey } },
      create: {
        apartmentId: apt.apartmentId,
        monthKey,
        isFinalized: true,
        finalizedAt: new Date(),
        finalizedById: member.memberId,
        snapshot: JSON.parse(JSON.stringify(summary)),
      },
      update: {
        isFinalized: true,
        finalizedAt: new Date(),
        finalizedById: member.memberId,
        snapshot: JSON.parse(JSON.stringify(summary)),
      },
    });

    return jsonOk(mealMonth);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { monthKey } = await params;
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    if (!member.isAdmin) {
      const { jsonError } = await import('@/lib/api-helpers');
      return jsonError('Admin access required', 403);
    }

    await prisma.mealMonth.updateMany({
      where: { apartmentId: apt.apartmentId, monthKey },
      data: { isFinalized: false, finalizedAt: null, finalizedById: null },
    });

    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
