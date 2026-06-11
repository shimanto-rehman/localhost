import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidMonthKey } from '@/lib/utils';
import { calculateMealCosts } from '@/lib/calculations/meals';
import { requireAptSession, jsonOk, jsonError, handleApiError } from '@/lib/api-helpers';

type Params = { params: Promise<{ monthKey: string }> };

function monthDateRange(monthKey: string) {
  const [y, m] = monthKey.split('-').map(Number);
  return {
    gte: new Date(y, m - 1, 1),
    lte: new Date(y, m, 0),
  };
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { monthKey } = await params;
    if (!isValidMonthKey(monthKey)) return jsonError('Invalid month key', 400);

    const apt = await requireAptSession(req);
    const range = monthDateRange(monthKey);

    const [records, shopping, mealMonth, mealConfig, members] = await Promise.all([
      prisma.mealRecord.findMany({
        where: { apartmentId: apt.apartmentId, mealDate: range },
      }),
      prisma.mealShopping.findMany({
        where: { apartmentId: apt.apartmentId, monthKey },
        include: { member: { select: { name: true } } },
      }),
      prisma.mealMonth.findUnique({
        where: { apartmentId_monthKey: { apartmentId: apt.apartmentId, monthKey } },
      }),
      prisma.mealConfig.findUnique({ where: { apartmentId: apt.apartmentId } }),
      prisma.member.findMany({
        where: { apartmentId: apt.apartmentId, isActive: true },
        orderBy: { createdAt: 'asc' },
      }),
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

    return jsonOk({
      records,
      shopping,
      mealMonth,
      mealConfig,
      members,
      summary,
      isFinalized: mealMonth?.isFinalized ?? false,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
