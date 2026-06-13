import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidMonthKey } from '@/lib/utils';
import { calculateMealCosts } from '@/lib/calculations/meals';
import { getMealCostInputs } from '@/lib/meal-summary';
import { requireAptSession, jsonOk, jsonError, handleApiError } from '@/lib/api-helpers';

type Params = { params: Promise<{ monthKey: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { monthKey } = await params;
    if (!isValidMonthKey(monthKey)) return jsonError('Invalid month key', 400);

    const apt = await requireAptSession(req);

    const [shopping, mealMonth, mealConfig, members, mealInputs] = await Promise.all([
      prisma.mealShopping.findMany({
        where: { apartmentId: apt.apartmentId, monthKey },
        include: { member: { select: { name: true, photoUrl: true } } },
      }),
      prisma.mealMonth.findUnique({
        where: { apartmentId_monthKey: { apartmentId: apt.apartmentId, monthKey } },
      }),
      prisma.mealConfig.findUnique({ where: { apartmentId: apt.apartmentId } }),
      prisma.member.findMany({
        where: { apartmentId: apt.apartmentId, isActive: true },
        orderBy: { createdAt: 'asc' },
      }),
      getMealCostInputs(apt.apartmentId, monthKey),
    ]);

    const summary = calculateMealCosts(
      mealInputs.records,
      mealInputs.shopping,
      mealInputs.rateOverride,
      mealInputs.slotOptInMatrix,
      mealInputs.foodExpenses,
    );

    return jsonOk({
      records: mealInputs.records,
      shopping,
      mealMonth,
      mealConfig,
      members,
      summary,
      slotOptInMatrix: mealInputs.slotOptInMatrix,
      isFinalized: mealMonth?.isFinalized ?? false,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
