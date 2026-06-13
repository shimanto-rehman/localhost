import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { monthKey } from '@/lib/utils';
import { getApartmentConfig } from '@/lib/apartment-data';
import { calculateBill } from '@/lib/calculations/bills';
import { computeExpenseCarryIn, calcExpenseMonth } from '@/lib/calculations/expenses';
import { requireAptSession, jsonOk, handleApiError } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const year = Number(req.nextUrl.searchParams.get('year') || new Date().getFullYear());

    const [bills, expenses, config] = await Promise.all([
      prisma.monthlyBill.findMany({
        where: {
          apartmentId: apt.apartmentId,
          monthKey: { startsWith: String(year) },
          isLocked: true,
        },
        include: { adjustments: true },
      }),
      prisma.expense.findMany({ where: { apartmentId: apt.apartmentId } }),
      getApartmentConfig(apt.apartmentId),
    ]);

    if (!config) return jsonOk(null);

    const mapExpense = (e: typeof expenses[0]) => ({
      id: e.id,
      memberId: e.memberId,
      itemName: e.itemName,
      price: e.price,
      category: e.category,
      expenseDate: e.expenseDate?.toISOString().slice(0, 10) ?? null,
    });

    const allByMonth: Record<string, ReturnType<typeof mapExpense>[]> = {};
    expenses.forEach((e) => {
      if (!allByMonth[e.monthKey]) allByMonth[e.monthKey] = [];
      allByMonth[e.monthKey].push(mapExpense(e));
    });
    const memberIds = config.members.map((m) => m.id);
    const carryCache: Record<string, Record<string, number>> = {};

    const monthlyTotals: { month: string; bills: number; meals: number; expenses: number }[] = [];
    const electricityTrend: { month: string; amount: number }[] = [];
    const gapTrend: { month: string; gap: number }[] = [];
    const personTotals: Record<string, number> = {};
    let yearCollected = 0;
    let yearGap = 0;
    let categoryTotals = { fixed: 0, optional: 0, electricity: 0, meals: 0 };

    for (let m = 1; m <= 12; m++) {
      const mk = `${year}-${String(m).padStart(2, '0')}`;
      const bill = bills.find((b) => b.monthKey === mk);
      let billTotal = 0;
      let mealTotal = 0;
      let gap = 0;

      if (bill?.electricity != null) {
        const snapshot = bill.snapshot as Record<string, unknown>;
        const mealCosts = (snapshot?.mealCosts as Record<string, number>) || {};
        const adjustmentsByMember: Record<string, typeof bill.adjustments> = {};
        bill.adjustments.forEach((a) => {
          if (!adjustmentsByMember[a.memberId]) adjustmentsByMember[a.memberId] = [];
          adjustmentsByMember[a.memberId].push(a);
        });

        const calc = calculateBill({
          members: config.members,
          fixedCosts: config.fixedCosts,
          optionalCosts: config.optionalCosts,
          optInMatrix: config.optInMatrix,
          rentSplits: config.rentSplits,
          electricity: bill.electricity,
          mealCosts,
          adjustments: adjustmentsByMember as Record<string, { id: string; memberId: string; type: 'lend' | 'borrow'; label: string; amount: number }[]>,
          useSnapshot: bill.isLocked && snapshot ? {
            members: (snapshot.members as typeof config.members) || config.members,
            fixedCosts: (snapshot.fixedCosts as typeof config.fixedCosts) || config.fixedCosts,
            optionalCosts: (snapshot.optionalCosts as typeof config.optionalCosts) || config.optionalCosts,
            optInMatrix: (snapshot.optInMatrix as typeof config.optInMatrix) || config.optInMatrix,
            rentSplits: (snapshot.rentSplits as typeof config.rentSplits) || config.rentSplits,
          } : undefined,
        });

        if (calc) {
          billTotal = calc.collectedTotal;
          mealTotal = calc.mealTotal;
          gap = calc.gap;
          yearCollected += calc.collectedTotal;
          yearGap += calc.gap;
          categoryTotals.fixed += calc.fixedBucket;
          categoryTotals.optional += calc.optionalTotal;
          categoryTotals.electricity += bill.electricity;
          categoryTotals.meals += calc.mealTotal;
          calc.results.forEach((r) => {
            personTotals[r.id] = (personTotals[r.id] || 0) + r.total;
          });
          electricityTrend.push({ month: mk, amount: bill.electricity });
          gapTrend.push({ month: mk, gap });
        }
      }

      const monthExpenses = expenses.filter((e) => e.monthKey === mk);
      const carryIn = computeExpenseCarryIn(mk, allByMonth, memberIds, carryCache);
      const expCalc = calcExpenseMonth(mk, monthExpenses.map(mapExpense), config.members, carryIn);
      const expenseTotal = expCalc.totalMonthSpend;

      monthlyTotals.push({ month: mk, bills: billTotal, meals: mealTotal, expenses: expenseTotal });
    }

    const expenseByMemberMonth: Record<string, Record<string, number>> = {};
    expenses
      .filter((e) => e.monthKey.startsWith(String(year)))
      .forEach((e) => {
        if (!expenseByMemberMonth[e.monthKey]) expenseByMemberMonth[e.monthKey] = {};
        expenseByMemberMonth[e.monthKey][e.memberId] =
          (expenseByMemberMonth[e.monthKey][e.memberId] || 0) + e.price;
      });

    const fixedBucketTotal = config.fixedCosts
      .filter((c) => c.inFixedBucket)
      .reduce((s, c) => s + c.amount, 0);

    return jsonOk({
      year,
      monthlyTotals,
      electricityTrend,
      gapTrend,
      personTotals,
      yearCollected,
      yearGap,
      categoryTotals,
      expenseByMemberMonth,
      lockedMonthsCount: bills.length,
      fixedBucketTotal,
      activeMembers: config.members.filter((m) => m.isActive).length,
      members: config.members,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
