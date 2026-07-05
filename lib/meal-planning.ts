import type { MealRecord } from './calculations/meals';

/** Persisted future-meal intent (null = unplanned). */
export type MealPlanStatus = 'PLANNED' | 'OPT_OUT';

export type MealPlanUiState = 'unplanned' | 'planned' | 'opt_out';

export function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function mealDayKey(mealDate: string): string {
  return mealDate.slice(0, 10);
}

/** UI / cycle state for a single slot (future dates). */
export function getMealPlanUiState(
  record?: Pick<MealRecord, 'planStatus'> | null,
): MealPlanUiState {
  if (record?.planStatus === 'PLANNED') return 'planned';
  if (record?.planStatus === 'OPT_OUT') return 'opt_out';
  return 'unplanned';
}

/** unplanned → planned → opt_out → unplanned (null). */
export function nextMealPlanStatus(current: MealPlanUiState): MealPlanStatus | null {
  if (current === 'unplanned') return 'PLANNED';
  if (current === 'planned') return 'OPT_OUT';
  return null;
}

/**
 * True when the member has set any future plan on this calendar day (any slot).
 * When true, unplanned slots on that day must not auto-fill on arrival.
 */
export function memberDayHasPlanning(
  records: Pick<MealRecord, 'memberId' | 'mealDate' | 'planStatus'>[],
  memberId: string,
  mealDate: string,
): boolean {
  const day = mealDayKey(mealDate);
  return records.some(
    (r) =>
      r.memberId === memberId &&
      mealDayKey(r.mealDate) === day &&
      r.planStatus != null,
  );
}

export function findMealRecord(
  records: MealRecord[],
  memberId: string,
  mealDate: string,
  mealSlot: number,
): MealRecord | undefined {
  const day = mealDayKey(mealDate);
  return records.find(
    (r) =>
      r.memberId === memberId &&
      mealDayKey(r.mealDate) === day &&
      r.mealSlot === mealSlot,
  );
}
