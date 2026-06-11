import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateMealCosts } from '@/lib/calculations/meals';
import {
  requireAptSession,
  requireMemberSession,
  requireBillManagerOrAdmin,
  jsonOk,
  handleApiError,
} from '@/lib/api-helpers';

type Params = { params: Promise<{ monthKey: string }> };

function monthDateRange(monthKey: string) {
  const [y, m] = monthKey.split('-').map(Number);
  return { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0) };
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { monthKey } = await params;
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    requireBillManagerOrAdmin(member);

    const range = monthDateRange(monthKey);
    const [records, shopping, mealConfig] = await Promise.all([
      prisma.mealRecord.findMany({
        where: { apartmentId: apt.apartmentId, mealDate: range },
      }),
      prisma.mealShopping.findMany({
        where: { apartmentId: apt.apartmentId, monthKey },
      }),
      prisma.mealConfig.findUnique({ where: { apartmentId: apt.apartmentId } }),
    ]);

    const summary = calculateMealCosts(
      records.map((r) => ({
        memberId: r.memberId,
        mealDate: r.mealDate.toISOString().slice(0, 10),
        mealSlot: r.mealSlot,
        isConfirmed: r.isConfirmed,
      })),
      shopping.map((s) => ({ memberId: s.memberId, amount: s.amount })),
      mealConfig?.rateOverride
    );

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
