import { monthKey, parseMonthKey } from '../utils';

export interface ExpenseItem {
  id: string;
  memberId: string;
  itemName: string;
  price: number;
  category: string;
  expenseDate?: string | null;
}

export interface ExpenseMemberResult {
  id: string;
  name: string;
  photoUrl?: string | null;
  items: ExpenseItem[];
  monthSpend: number;
  carried: number;
  grandTotal: number;
  base: number;
  extra: number;
  forwardOut: number;
  isBase: boolean;
  categories: Record<string, number>;
}

export interface ExpenseMonthCalc {
  key: string;
  results: ExpenseMemberResult[];
  base: number;
  carryIn: Record<string, number>;
  totalMonthSpend: number;
  totalExtra: number;
  totalForward: number;
}

export function computeExpenseCarryIn(
  targetMonthKey: string,
  allExpenses: Record<string, ExpenseItem[]>,
  memberIds: string[],
  cache: Record<string, Record<string, number>> = {}
): Record<string, number> {
  if (cache[targetMonthKey]) return cache[targetMonthKey];

  const carry: Record<string, number> = {};
  memberIds.forEach((id) => { carry[id] = 0; });

  const keys = Object.keys(allExpenses)
    .filter((k) => /^\d{4}-\d{2}$/.test(k))
    .sort();

  const firstKey = keys[0];
  if (!firstKey || targetMonthKey === firstKey) {
    cache[targetMonthKey] = carry;
    return carry;
  }

  const targetDate = parseMonthKey(targetMonthKey);
  const prevDate = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);
  const prevKey = monthKey(prevDate);

  if (prevKey < firstKey) {
    cache[targetMonthKey] = carry;
    return carry;
  }

  const prevCarryIn = computeExpenseCarryIn(prevKey, allExpenses, memberIds, cache);
  const memberStubs = memberIds.map((id) => ({ id, name: id }));
  const prevCalc = calcExpenseMonth(prevKey, allExpenses[prevKey] || [], memberStubs, prevCarryIn);
  prevCalc.results.forEach((r) => { carry[r.id] = r.forwardOut; });

  cache[targetMonthKey] = carry;
  return carry;
}

export function calcExpenseMonth(
  key: string,
  items: ExpenseItem[],
  members: { id: string; name: string; photoUrl?: string | null }[],
  carryIn: Record<string, number>
): ExpenseMonthCalc {
  const results: ExpenseMemberResult[] = members.map((m) => {
    const memberItems = items.filter((i) => i.memberId === m.id);
    const monthSpend = memberItems.reduce((s, i) => s + i.price, 0);
    const carried = carryIn[m.id] || 0;
    const grandTotal = monthSpend + carried;
    const categories: Record<string, number> = {};
    memberItems.forEach((item) => {
      categories[item.category] = (categories[item.category] || 0) + item.price;
    });
    return {
      id: m.id,
      name: m.name,
      photoUrl: m.photoUrl,
      items: memberItems,
      monthSpend,
      carried,
      grandTotal,
      base: 0,
      extra: 0,
      forwardOut: 0,
      isBase: false,
      categories,
    };
  });

  const base = results.length ? Math.min(...results.map((r) => r.grandTotal)) : 0;

  results.forEach((r) => {
    r.base = base;
    r.extra = Math.max(0, r.grandTotal - base);
    r.forwardOut = r.extra;
    r.isBase = r.grandTotal === base;
  });

  return {
    key,
    results,
    base,
    carryIn,
    totalMonthSpend: results.reduce((s, r) => s + r.monthSpend, 0),
    totalExtra: results.reduce((s, r) => s + r.extra, 0),
    totalForward: results.reduce((s, r) => s + r.forwardOut, 0),
  };
}
