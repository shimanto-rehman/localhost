import { prisma } from './prisma';
import { getApartmentConfig } from './apartment-data';
import { getBillCalculation } from './bill-calculation';
import { calculateBill } from './calculations/bills';
import { getMealSummary } from './meal-summary';
import { monthKey } from './utils';

export type MemberProfileMonth = {
  monthKey: string;
  billTotal: number;
  billBreakdown: {
    fixedBucket: number;
    electricity: number;
    meals: number;
    optional: number;
  };
  expenseTotal: number;
  mealCount: number;
};

export async function getMemberProfile(
  apartmentId: string,
  memberId: string,
  year: number,
) {
  const config = await getApartmentConfig(apartmentId);
  if (!config) return null;

  const member = config.members.find((m) => m.id === memberId);
  if (!member) return null;

  const yearPrefix = String(year);
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  const [bills, expenses, mealRecords, mealSlots, apartment] = await Promise.all([
    prisma.monthlyBill.findMany({
      where: {
        apartmentId,
        monthKey: { startsWith: yearPrefix },
        isLocked: true,
      },
      include: { adjustments: true },
    }),
    prisma.expense.findMany({
      where: {
        apartmentId,
        memberId,
        monthKey: { startsWith: yearPrefix },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.mealRecord.findMany({
      where: {
        apartmentId,
        memberId,
        isConfirmed: true,
        mealDate: { gte: startDate, lte: endDate },
      },
    }),
    prisma.mealMemberSlot.findMany({
      where: { apartmentId, memberId },
    }),
    prisma.apartment.findUnique({
      where: { id: apartmentId },
      select: { name: true, billManagerId: true, adminMemberId: true },
    }),
  ]);

  const months: MemberProfileMonth[] = [];
  let yearBillTotal = 0;
  let yearExpenseTotal = 0;
  let yearMealCount = 0;
  const expenseByCategory: Record<string, number> = {};
  const optionalYear: Record<string, number> = {};

  for (let m = 1; m <= 12; m++) {
    const mk = `${year}-${String(m).padStart(2, '0')}`;
    const bill = bills.find((b) => b.monthKey === mk);
    let billTotal = 0;
    const billBreakdown = { fixedBucket: 0, electricity: 0, meals: 0, optional: 0 };

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
        adjustments: adjustmentsByMember as Record<
          string,
          { id: string; memberId: string; type: 'lend' | 'borrow'; label: string; amount: number }[]
        >,
        useSnapshot:
          bill.isLocked && snapshot
            ? {
                members: (snapshot.members as typeof config.members) || config.members,
                fixedCosts: (snapshot.fixedCosts as typeof config.fixedCosts) || config.fixedCosts,
                optionalCosts:
                  (snapshot.optionalCosts as typeof config.optionalCosts) || config.optionalCosts,
                optInMatrix:
                  (snapshot.optInMatrix as typeof config.optInMatrix) || config.optInMatrix,
                rentSplits:
                  (snapshot.rentSplits as typeof config.rentSplits) || config.rentSplits,
              }
            : undefined,
      });

      const row = calc?.results.find((r) => r.id === memberId);
      if (row) {
        billTotal = row.total;
        billBreakdown.fixedBucket = row.breakdown.fixedBucket;
        billBreakdown.electricity = row.breakdown.electricity;
        billBreakdown.meals = row.breakdown.meals;
        const optSum = Object.values(row.breakdown.optional || {}).reduce((s, v) => s + v, 0);
        const varSum = Object.values(row.breakdown.variable || {}).reduce((s, v) => s + v, 0);
        billBreakdown.optional = optSum + varSum;
        Object.entries(row.breakdown.optional || {}).forEach(([id, amt]) => {
          const name = config.optionalCosts.find((o) => o.id === id)?.name || 'Optional';
          optionalYear[name] = (optionalYear[name] || 0) + amt;
        });
        yearBillTotal += billTotal;
      }
    }

    const monthExpenses = expenses.filter((e) => e.monthKey === mk);
    const expenseTotal = monthExpenses.reduce((s, e) => s + e.price, 0);
    monthExpenses.forEach((e) => {
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.price;
    });
    yearExpenseTotal += expenseTotal;

    const mealCount = mealRecords.filter((r) => {
      const d = r.mealDate;
      return d.getFullYear() === year && d.getMonth() === m - 1;
    }).length;
    yearMealCount += mealCount;

    months.push({ monthKey: mk, billTotal, billBreakdown, expenseTotal, mealCount });
  }

  const currentMk = monthKey(new Date());
  const [billResult, currentMealSummary] = await Promise.all([
    getBillCalculation(apartmentId, currentMk),
    getMealSummary(apartmentId, currentMk),
  ]);

  const currentMemberBill = billResult?.calculation?.results.find((r) => r.id === memberId)?.total ?? 0;
  const currentMealMember = currentMealSummary.memberSummaries.find((s) => s.memberId === memberId);

  const optedInCosts = config.optionalCosts
    .filter((oc) => config.optInMatrix[oc.id]?.[memberId] !== false)
    .map((oc) => ({ id: oc.id, name: oc.name, amount: oc.amount }));

  const mealNames = config.mealConfig?.mealNames ?? ['Lunch', 'Dinner'];
  const enrolledSlots = mealNames
    .map((name, slot) => ({
      slot,
      name,
      optedIn: mealSlots.find((s) => s.mealSlot === slot)?.optedIn !== false,
    }))
    .filter((s) => s.optedIn);

  const isAdmin = apartment?.adminMemberId === memberId;
  const isBillManager = apartment?.billManagerId === memberId;

  const currentBreakdown = billResult?.calculation?.results.find((r) => r.id === memberId)?.breakdown;

  return {
    member: {
      id: member.id,
      name: member.name,
      photoUrl: member.photoUrl,
      isAdmin,
      isBillManager,
      roleLabel: isAdmin ? 'Admin' : isBillManager ? 'Bill Manager' : 'Member',
    },
    apartmentName: apartment?.name ?? 'Apartment',
    year,
    months,
    yearBillTotal,
    yearExpenseTotal,
    yearMealCount,
    yearGrandTotal: yearBillTotal + yearExpenseTotal,
    expenseByCategory,
    optionalYearBreakdown: Object.entries(optionalYear)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount),
    currentMonth: {
      monthKey: currentMk,
      billDue: currentMemberBill,
      billBreakdown: currentBreakdown
        ? {
            fixedBucket: currentBreakdown.fixedBucket,
            electricity: currentBreakdown.electricity,
            meals: currentBreakdown.meals,
            optional:
              Object.values(currentBreakdown.optional || {}).reduce((s, v) => s + v, 0) +
              Object.values(currentBreakdown.variable || {}).reduce((s, v) => s + v, 0),
          }
        : { fixedBucket: 0, electricity: 0, meals: 0, optional: 0 },
      mealCount: currentMealMember?.mealCount ?? 0,
      mealNet: currentMealMember?.net ?? 0,
      mealContribution: currentMealMember?.shoppingContribution ?? 0,
      perMealCost: currentMealSummary.perMealCost,
    },
    optedInCosts,
    enrolledMealSlots: enrolledSlots,
    recentExpenses: expenses.slice(0, 8).map((e) => ({
      id: e.id,
      itemName: e.itemName,
      price: e.price,
      category: e.category,
      monthKey: e.monthKey,
    })),
  };
}
