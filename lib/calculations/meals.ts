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
  /** Total paid toward the pool (Food expenses + meal shopping entries). */
  shoppingContribution: number;
  foodContribution: number;
  mealShoppingContribution: number;
  mealCostDue: number;
  net: number;
  mealCountBySlot?: Record<number, number>;
}

/** memberId → mealSlot → optedIn (default true when missing). */
export type MealSlotOptInMatrix = Record<string, Record<number, boolean>>;

export type MealRateMode = 'fixed' | 'auto';

export function isMealSlotOptedIn(
  matrix: MealSlotOptInMatrix | undefined,
  memberId: string,
  mealSlot: number,
): boolean {
  if (!matrix) return true;
  const memberSlots = matrix[memberId];
  if (!memberSlots) return true;
  return memberSlots[mealSlot] !== false;
}

export function filterEligibleMealRecords(
  records: MealRecord[],
  slotOptInMatrix?: MealSlotOptInMatrix,
): MealRecord[] {
  if (!slotOptInMatrix) return records;
  return records.filter((r) => isMealSlotOptedIn(slotOptInMatrix, r.memberId, r.mealSlot));
}

export function calculateMealCosts(
  records: MealRecord[],
  shopping: ShoppingEntry[],
  rateOverride?: number | null,
  slotOptInMatrix?: MealSlotOptInMatrix,
  foodExpenses?: ShoppingEntry[],
): {
  totalShoppingPool: number;
  foodExpensePool: number;
  shoppingPool: number;
  totalMealCount: number;
  perMealCost: number;
  rateMode: MealRateMode;
  memberSummaries: MealMemberSummary[];
  mealSurplus: number;
  memberMealCosts: Record<string, number>;
} {
  const eligibleRecords = filterEligibleMealRecords(records, slotOptInMatrix);
  const shoppingPool = shopping.reduce((s, e) => s + e.amount, 0);
  const foodExpensePool = (foodExpenses ?? []).reduce((s, e) => s + e.amount, 0);
  const autoPool = foodExpensePool + shoppingPool;

  const confirmed = eligibleRecords.filter((r) => r.isConfirmed);
  const totalMealCount = confirmed.length;

  const rateMode: MealRateMode = rateOverride != null ? 'fixed' : 'auto';
  const perMealCost =
    rateOverride != null
      ? rateOverride
      : totalMealCount > 0
        ? Math.round((autoPool / totalMealCount) * 100) / 100
        : 0;

  const totalShoppingPool = autoPool;

  const mealCountByMember: Record<string, number> = {};
  const mealCountByMemberSlot: Record<string, Record<number, number>> = {};
  const foodByMember: Record<string, number> = {};
  const shoppingByMember: Record<string, number> = {};

  confirmed.forEach((r) => {
    mealCountByMember[r.memberId] = (mealCountByMember[r.memberId] || 0) + 1;
    if (!mealCountByMemberSlot[r.memberId]) mealCountByMemberSlot[r.memberId] = {};
    mealCountByMemberSlot[r.memberId][r.mealSlot] =
      (mealCountByMemberSlot[r.memberId][r.mealSlot] || 0) + 1;
  });

  (foodExpenses ?? []).forEach((e) => {
    foodByMember[e.memberId] = (foodByMember[e.memberId] || 0) + e.amount;
  });

  shopping.forEach((s) => {
    shoppingByMember[s.memberId] = (shoppingByMember[s.memberId] || 0) + s.amount;
  });

  const allMemberIds = new Set([
    ...Object.keys(mealCountByMember),
    ...Object.keys(foodByMember),
    ...Object.keys(shoppingByMember),
    ...(foodExpenses ?? []).map((e) => e.memberId),
    ...shopping.map((s) => s.memberId),
    ...confirmed.map((r) => r.memberId),
  ]);

  const memberMealCosts: Record<string, number> = {};
  const memberSummaries: MealMemberSummary[] = [];

  allMemberIds.forEach((memberId) => {
    const mealCount = mealCountByMember[memberId] || 0;
    const foodContribution = foodByMember[memberId] || 0;
    const mealShoppingContribution = shoppingByMember[memberId] || 0;
    const shoppingContribution = foodContribution + mealShoppingContribution;
    const mealCostDue = Math.ceil(perMealCost * mealCount);
    memberMealCosts[memberId] = mealCostDue;
    memberSummaries.push({
      memberId,
      mealCount,
      shoppingContribution,
      foodContribution,
      mealShoppingContribution,
      mealCostDue,
      net: mealCostDue - shoppingContribution,
      mealCountBySlot: mealCountByMemberSlot[memberId] || {},
    });
  });

  const collectedMeals = Object.values(memberMealCosts).reduce((s, v) => s + v, 0);
  const mealSurplus = collectedMeals - autoPool;

  return {
    totalShoppingPool,
    foodExpensePool,
    shoppingPool,
    totalMealCount,
    perMealCost,
    rateMode,
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

  const weekStart = new Date(firstOfMonth);
  while (weekStart.getDay() !== weekStartDay) {
    weekStart.setDate(weekStart.getDate() - 1);
  }

  const weeks: Date[][] = [];
  const d = new Date(weekStart);

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
    week.some((d) => d.toISOString().slice(0, 10) === todayStr),
  );
  return idx >= 0 ? idx : 0;
}
