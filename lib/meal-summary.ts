import { prisma } from './prisma';
import { MEAL_POOL_EXPENSE_CATEGORIES } from './constants';
import type { GuestMealMode } from './constants';
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

  const [records, shopping, mealConfig, foodExpenseRows, guestRecords, activeMembers] =
    await Promise.all([
    prisma.mealRecord.findMany({
      where: { apartmentId, mealDate: range },
      select: { memberId: true, mealDate: true, mealSlot: true, isConfirmed: true, planStatus: true },
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
    prisma.guestMealRecord.findMany({
      where: { apartmentId, mealDate: range },
      select: { memberId: true, mealDate: true, mealSlot: true, guestCount: true },
    }),
    prisma.member.findMany({
      where: { apartmentId, isActive: true },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const mealsPerDay = mealConfig?.mealsPerDay ?? 2;
  const slotOptInMatrix = await loadMealSlotOptInMatrix(apartmentId, mealsPerDay);
  const guestMealMode = (mealConfig?.guestMealMode ?? 'EQUAL_SPLIT') as GuestMealMode;

  return {
    records: records.map((r) => {
      const d = r.mealDate;
      return {
        memberId: r.memberId,
        mealDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        mealSlot: r.mealSlot,
        isConfirmed: r.isConfirmed,
        planStatus: r.planStatus,
      };
    }),
    shopping: shopping.map((s) => ({ memberId: s.memberId, amount: s.amount })),
    foodExpenses: foodExpenseRows.map((e) => ({ memberId: e.memberId, amount: e.price })),
    guestRecords: guestRecords.map((g) => {
      const d = g.mealDate;
      return {
        memberId: g.memberId,
        mealDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        mealSlot: g.mealSlot,
        guestCount: g.guestCount,
      };
    }),
    rateOverride: mealConfig?.rateOverride,
    slotOptInMatrix,
    guestMealMode,
    activeMemberIds: activeMembers.map((m) => m.id),
    mealConfig,
  };
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function getMealSummary(apartmentId: string, monthKey: string) {
  const inputs = await getMealCostInputs(apartmentId, monthKey);
  return calculateMealCosts(
    inputs.records,
    inputs.shopping,
    inputs.rateOverride,
    inputs.slotOptInMatrix,
    inputs.foodExpenses,
    inputs.guestRecords,
    inputs.guestMealMode,
    inputs.activeMemberIds,
    {
      monthKey,
      mealsPerDay: inputs.mealConfig?.mealsPerDay ?? 2,
      todayStr: localDateStr(new Date()),
    },
  );
}
