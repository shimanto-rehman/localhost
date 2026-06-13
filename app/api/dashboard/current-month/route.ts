import { NextRequest } from 'next/server';
import { monthKey } from '@/lib/utils';
import { getBillCalculation } from '@/lib/bill-calculation';
import { getMealSummary } from '@/lib/meal-summary';
import { requireAptSession, jsonOk, handleApiError } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const mk = monthKey(new Date());

    const [billResult, mealSummary] = await Promise.all([
      getBillCalculation(apt.apartmentId, mk),
      getMealSummary(apt.apartmentId, mk),
    ]);

    return jsonOk({
      monthKey: mk,
      calculation: billResult?.calculation ?? null,
      optionalCostDetails: billResult?.optionalCostDetails ?? [],
      mealSummary,
      totalMealsThisMonth: mealSummary?.totalMealCount || 0,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
