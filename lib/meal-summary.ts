import { prisma } from './prisma';
import { MEAL_POOL_EXPENSE_CATEGORIES } from './constants';
import { calculateMealCosts } from './calculations/meals';
import { loadMealSlotOptInMatrix } from './meal-member-slots';

function monthDateRange(monthKey: string) {
  const [y, m] = monthKey.split('-').map(Number);
  return {
    gte: new Date(y, m - 1, 1),
    lte: new Date(y, m, 0),
  };
}

export async function getMealCostInputs(apartmentId: string, monthKey: string) {
  const range = monthDateRange(monthKey);

  const [records, shopping, mealConfig, foodExpenseRows] = await Promise.all([
    prisma.mealRecord.findMany({
      where: { apartmentId, mealDate: range },
    }),
    prisma.mealShopping.findMany({
      where: { apartmentId, monthKey },
    }),
    prisma.mealConfig.findUnique({ where: { apartmentId } }),
    prisma.expense.findMany({
      where: {
        apartmentId,
        monthKey,
        category: { in: [...MEAL_POOL_EXPENSE_CATEGORIES] },
      },
      select: { memberId: true, price: true },
    }),
  ]);

  const mealsPerDay = mealConfig?.mealsPerDay ?? 2;
  const slotOptInMatrix = await loadMealSlotOptInMatrix(apartmentId, mealsPerDay);

  return {
    records: records.map((r) => ({
      memberId: r.memberId,
      mealDate: r.mealDate.toISOString().slice(0, 10),
      mealSlot: r.mealSlot,
      isConfirmed: r.isConfirmed,
    })),
    shopping: shopping.map((s) => ({ memberId: s.memberId, amount: s.amount })),
    foodExpenses: foodExpenseRows.map((e) => ({ memberId: e.memberId, amount: e.price })),
    rateOverride: mealConfig?.rateOverride,
    slotOptInMatrix,
  };
}

export async function getMealSummary(apartmentId: string, monthKey: string) {
  const inputs = await getMealCostInputs(apartmentId, monthKey);
  return calculateMealCosts(
    inputs.records,
    inputs.shopping,
    inputs.rateOverride,
    inputs.slotOptInMatrix,
    inputs.foodExpenses,
  );
}
