export interface MealRecord {
  memberId: string;
  mealDate: string;
  mealSlot: number;
  isConfirmed: boolean;
}

export interface ShoppingEntry {
  memberId: string;
  amount: number;
}

export interface MealMemberSummary {
  memberId: string;
  mealCount: number;
  shoppingContribution: number;
  mealCostDue: number;
  net: number;
}

export function calculateMealCosts(
  records: MealRecord[],
  shopping: ShoppingEntry[],
  rateOverride?: number | null
): {
  totalShoppingPool: number;
  totalMealCount: number;
  perMealCost: number;
  memberSummaries: MealMemberSummary[];
  mealSurplus: number;
  memberMealCosts: Record<string, number>;
} {
  const totalShoppingPool = shopping.reduce((s, e) => s + e.amount, 0);
  const confirmed = records.filter((r) => r.isConfirmed);
  const totalMealCount = confirmed.length;

  const perMealCost =
    rateOverride != null
      ? rateOverride
      : totalMealCount > 0
        ? Math.round((totalShoppingPool / totalMealCount) * 100) / 100
        : 0;

  const mealCountByMember: Record<string, number> = {};
  const shoppingByMember: Record<string, number> = {};

  confirmed.forEach((r) => {
    mealCountByMember[r.memberId] = (mealCountByMember[r.memberId] || 0) + 1;
  });

  shopping.forEach((s) => {
    shoppingByMember[s.memberId] = (shoppingByMember[s.memberId] || 0) + s.amount;
  });

  const allMemberIds = new Set([
    ...Object.keys(mealCountByMember),
    ...Object.keys(shoppingByMember),
    ...shopping.map((s) => s.memberId),
    ...confirmed.map((r) => r.memberId),
  ]);

  const memberMealCosts: Record<string, number> = {};
  const memberSummaries: MealMemberSummary[] = [];

  allMemberIds.forEach((memberId) => {
    const mealCount = mealCountByMember[memberId] || 0;
    const shoppingContribution = shoppingByMember[memberId] || 0;
    const mealCostDue = Math.ceil(perMealCost * mealCount);
    memberMealCosts[memberId] = mealCostDue;
    memberSummaries.push({
      memberId,
      mealCount,
      shoppingContribution,
      mealCostDue,
      net: mealCostDue - shoppingContribution,
    });
  });

  const collectedMeals = Object.values(memberMealCosts).reduce((s, v) => s + v, 0);
  const mealSurplus = collectedMeals - totalShoppingPool;

  return {
    totalShoppingPool,
    totalMealCount,
    perMealCost,
    memberSummaries,
    mealSurplus,
    memberMealCosts,
  };
}

export function getWeekDates(monthKey: string, weekStartDay: number, weekIndex: number): Date[] {
  const [year, month] = monthKey.split('-').map(Number);
  const firstOfMonth = new Date(year, month - 1, 1);
  const lastOfMonth = new Date(year, month, 0);

  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  const d = new Date(firstOfMonth);

  while (d <= lastOfMonth) {
    if (d.getDay() === weekStartDay && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  if (currentWeek.length) weeks.push(currentWeek);

  return weeks[weekIndex] || weeks[weeks.length - 1] || [];
}

export function getWeeksInMonth(monthKey: string, weekStartDay: number): Date[][] {
  const [year, month] = monthKey.split('-').map(Number);
  const firstOfMonth = new Date(year, month - 1, 1);
  const lastOfMonth = new Date(year, month, 0);

  // Find the weekStartDay on or before the first day of the month
  const weekStart = new Date(firstOfMonth);
  while (weekStart.getDay() !== weekStartDay) {
    weekStart.setDate(weekStart.getDate() - 1);
  }

  const weeks: Date[][] = [];
  const d = new Date(weekStart);

  // Build complete 7-day weeks until we've covered the whole month
  while (d <= lastOfMonth) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

export function getCurrentWeekIndex(monthKey: string, weekStartDay: number): number {
  const weeks = getWeeksInMonth(monthKey, weekStartDay);
  const today = new Date();
  const [year, month] = monthKey.split('-').map(Number);
  if (today.getFullYear() !== year || today.getMonth() !== month - 1) {
    return 0;
  }
  const todayStr = today.toISOString().slice(0, 10);
  const idx = weeks.findIndex((week) =>
    week.some((d) => d.toISOString().slice(0, 10) === todayStr)
  );
  return idx >= 0 ? idx : 0;
}
