import type { GuestMealMode } from '@/lib/constants';
import {
  findMealRecord,
  localDateStr,
  memberDayHasPlanning,
  mealDayKey,
} from '@/lib/meal-planning';

export type MealPlanStatus = 'PLANNED' | 'OPT_OUT';

export interface MealRecord {
  memberId: string;
  mealDate: string;
  mealSlot: number;
  isConfirmed: boolean;
  planStatus?: MealPlanStatus | null;
}

export interface GuestMealRecord {
  memberId: string;
  mealDate: string;
  mealSlot: number;
  guestCount: number;
}

export interface ShoppingEntry {
  memberId: string;
  amount: number;
}

export interface MealMemberSummary {
  memberId: string;
  mealCount: number;
  guestMealCount: number;
  /** Total paid toward the pool (Food expenses + meal shopping entries). */
  shoppingContribution: number;
  foodContribution: number;
  mealShoppingContribution: number;
  mealCostDue: number;
  guestMealCost: number;
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

function localDateStrFromDate(d: Date): string {
  return localDateStr(d);
}

/** True when a member meal counts as confirmed for display or billing. */
export function isMealConfirmed(
  records: MealRecord[],
  memberId: string,
  mealDate: string,
  mealSlot: number,
  slotOptInMatrix?: MealSlotOptInMatrix,
  todayStr?: string,
): boolean {
  if (!isMealSlotOptedIn(slotOptInMatrix, memberId, mealSlot)) return false;

  const date = mealDayKey(mealDate);
  const today = todayStr ?? localDateStr();
  const rec = findMealRecord(records, memberId, date, mealSlot);
  const dayHasPlanning = memberDayHasPlanning(records, memberId, date);

  if (date > today) return false;

  if (rec) {
    if (rec.isConfirmed) return true;
    if (rec.planStatus === 'PLANNED') return true;
    if (rec.planStatus === 'OPT_OUT') return false;
    return false;
  }

  if (dayHasPlanning) return false;
  return true;
}

export type MealCostOptions = {
  monthKey?: string;
  mealsPerDay?: number;
  todayStr?: string;
};

function addImplicitMealCounts(
  records: MealRecord[],
  slotOptInMatrix: MealSlotOptInMatrix | undefined,
  activeMemberIds: string[],
  mealsPerDay: number,
  monthKey: string | undefined,
  todayStr: string | undefined,
  mealCountByMember: Record<string, number>,
  mealCountByMemberSlot: Record<string, Record<number, number>>,
): number {
  const today = todayStr ?? localDateStr();
  const effectiveMonth = monthKey ?? today.slice(0, 7);
  const [y, m] = effectiveMonth.split('-').map(Number);
  const startDate = new Date(y, m - 1, 1);
  const lastDay = new Date(y, m, 0).getDate();

  if (today < effectiveMonth) return 0;

  const endDay = today.startsWith(effectiveMonth) ? Number(today.slice(8)) : lastDay;
  const endDate = new Date(y, m - 1, endDay);

  let added = 0;
  const d = new Date(startDate);
  while (d <= endDate) {
    const dateStr = localDateStrFromDate(d);
    for (const memberId of activeMemberIds) {
      for (let slot = 0; slot < mealsPerDay; slot++) {
        if (!isMealSlotOptedIn(slotOptInMatrix, memberId, slot)) continue;
        if (!isMealConfirmed(records, memberId, dateStr, slot, slotOptInMatrix, today)) continue;
        const rec = findMealRecord(records, memberId, dateStr, slot);
        if (rec?.isConfirmed) continue;
        mealCountByMember[memberId] = (mealCountByMember[memberId] || 0) + 1;
        if (!mealCountByMemberSlot[memberId]) mealCountByMemberSlot[memberId] = {};
        mealCountByMemberSlot[memberId][slot] =
          (mealCountByMemberSlot[memberId][slot] || 0) + 1;
        added++;
      }
    }
    d.setDate(d.getDate() + 1);
  }
  return added;
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
  guestRecords: GuestMealRecord[] = [],
  guestMealMode: GuestMealMode = 'EQUAL_SPLIT',
  activeMemberIds: string[] = [],
  options?: MealCostOptions,
): {
  totalShoppingPool: number;
  foodExpensePool: number;
  shoppingPool: number;
  totalMealCount: number;
  totalGuestMealCount: number;
  perMealCost: number;
  rateMode: MealRateMode;
  guestMealMode: GuestMealMode;
  memberSummaries: MealMemberSummary[];
  mealSurplus: number;
  memberMealCosts: Record<string, number>;
} {
  const eligibleRecords = filterEligibleMealRecords(records, slotOptInMatrix);
  const shoppingPool = shopping.reduce((s, e) => s + e.amount, 0);
  const foodExpensePool = (foodExpenses ?? []).reduce((s, e) => s + e.amount, 0);
  const autoPool = foodExpensePool + shoppingPool;

  const confirmed = eligibleRecords.filter((r) => r.isConfirmed);
  const totalGuestMealCount = guestRecords.reduce((s, g) => s + Math.max(0, g.guestCount), 0);

  const mealCountByMember: Record<string, number> = {};
  const mealCountByMemberSlot: Record<string, Record<number, number>> = {};
  const guestCountByMember: Record<string, number> = {};
  const foodByMember: Record<string, number> = {};
  const shoppingByMember: Record<string, number> = {};

  const todayForCalc = options?.todayStr ?? localDateStr();

  confirmed.forEach((r) => {
    mealCountByMember[r.memberId] = (mealCountByMember[r.memberId] || 0) + 1;
    if (!mealCountByMemberSlot[r.memberId]) mealCountByMemberSlot[r.memberId] = {};
    mealCountByMemberSlot[r.memberId][r.mealSlot] =
      (mealCountByMemberSlot[r.memberId][r.mealSlot] || 0) + 1;
  });

  const implicitCount = addImplicitMealCounts(
    eligibleRecords,
    slotOptInMatrix,
    activeMemberIds,
    options?.mealsPerDay ?? 2,
    options?.monthKey,
    todayForCalc,
    mealCountByMember,
    mealCountByMemberSlot,
  );

  const totalMealCount =
    confirmed.length + implicitCount + totalGuestMealCount;

  guestRecords.forEach((g) => {
    if (g.guestCount <= 0) return;
    guestCountByMember[g.memberId] = (guestCountByMember[g.memberId] || 0) + g.guestCount;
  });

  const rateMode: MealRateMode = rateOverride != null ? 'fixed' : 'auto';
  const perMealCost =
    rateOverride != null
      ? rateOverride
      : totalMealCount > 0
        ? Math.round((autoPool / totalMealCount) * 100) / 100
        : 0;

  const totalShoppingPool = autoPool;

  (foodExpenses ?? []).forEach((e) => {
    foodByMember[e.memberId] = (foodByMember[e.memberId] || 0) + e.amount;
  });

  shopping.forEach((s) => {
    shoppingByMember[s.memberId] = (shoppingByMember[s.memberId] || 0) + s.amount;
  });

  const splitMemberIds =
    activeMemberIds.length > 0
      ? activeMemberIds
      : Array.from(
          new Set([
            ...Object.keys(mealCountByMember),
            ...Object.keys(guestCountByMember),
            ...Object.keys(foodByMember),
            ...Object.keys(shoppingByMember),
            ...(foodExpenses ?? []).map((e) => e.memberId),
            ...shopping.map((s) => s.memberId),
            ...confirmed.map((r) => r.memberId),
          ]),
        );

  const totalGuestCost = guestRecords.reduce(
    (s, g) => s + Math.ceil(perMealCost * Math.max(0, g.guestCount)),
    0,
  );
  const guestSharePerMember =
    guestMealMode === 'EQUAL_SPLIT' && splitMemberIds.length > 0
      ? Math.ceil(totalGuestCost / splitMemberIds.length)
      : 0;

  const memberMealCosts: Record<string, number> = {};
  const memberSummaries: MealMemberSummary[] = [];

  splitMemberIds.forEach((memberId) => {
    const mealCount = mealCountByMember[memberId] || 0;
    const guestMealCount = guestCountByMember[memberId] || 0;
    const foodContribution = foodByMember[memberId] || 0;
    const mealShoppingContribution = shoppingByMember[memberId] || 0;
    const shoppingContribution = foodContribution + mealShoppingContribution;
    const ownMealCost = Math.ceil(perMealCost * mealCount);
    const guestMealCost =
      guestMealMode === 'HOST_PAYS'
        ? Math.ceil(perMealCost * guestMealCount)
        : guestSharePerMember;
    const mealCostDue = ownMealCost + guestMealCost;
    memberMealCosts[memberId] = mealCostDue;
    memberSummaries.push({
      memberId,
      mealCount,
      guestMealCount,
      shoppingContribution,
      foodContribution,
      mealShoppingContribution,
      mealCostDue,
      guestMealCost,
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
    totalGuestMealCount,
    perMealCost,
    rateMode,
    guestMealMode,
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
  const todayStr = localDateStr(today);
  const idx = weeks.findIndex((week) =>
    week.some((d) => localDateStr(d) === todayStr),
  );
  return idx >= 0 ? idx : 0;
}

/** Confirmed member meals + guest meals for one calendar day. */
export function getDailyMealTotals(
  memberId: string,
  mealDate: string,
  records: MealRecord[],
  guestRecords: GuestMealRecord[],
  slots: number,
  slotOptInMatrix?: MealSlotOptInMatrix,
  todayStr?: string,
): { own: number; guest: number; total: number } {
  let own = 0;
  for (let slot = 0; slot < slots; slot++) {
    if (isMealConfirmed(records, memberId, mealDate, slot, slotOptInMatrix, todayStr)) {
      own++;
    }
  }
  const guest = guestRecords
    .filter((g) => g.memberId === memberId && g.mealDate.startsWith(mealDate))
    .reduce((s, g) => s + Math.max(0, g.guestCount), 0);
  return { own, guest, total: own + guest };
}
