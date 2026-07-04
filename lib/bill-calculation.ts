import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';
import { getApartmentConfig } from './apartment-data';
import { calculateBill } from './calculations/bills';
import { ceilPerHead } from './utils';
import { MONTH_NAMES } from './constants';

export function billCalcCacheTag(apartmentId: string, monthKey: string) {
  return `bill-calc-${apartmentId}-${monthKey}`;
}

async function computeBillCalculation(apartmentId: string, monthKey: string) {
  const [bill, config] = await Promise.all([
    prisma.monthlyBill.findUnique({
      where: { apartmentId_monthKey: { apartmentId, monthKey } },
      include: { adjustments: true },
    }),
    getApartmentConfig(apartmentId),
  ]);

  if (!config) return null;

  const electricity = bill?.electricity ?? null;
  const snapshot = bill?.snapshot as Record<string, unknown> | null;
  const mealCosts = (snapshot?.mealCosts as Record<string, number>) || {};

  // Filter out "Due" adjustments whose source-month bill is already paid by that member.
  const DUE_PREFIX = 'Due · ';
  const dueSourceMonths = new Set<string>();
  (bill?.adjustments || []).forEach((a) => {
    if (a.label.startsWith(DUE_PREFIX)) {
      const parts = a.label.slice(DUE_PREFIX.length).trim().split(' ');
      if (parts.length === 2) {
        const monthIdx = MONTH_NAMES.indexOf(parts[0]);
        if (monthIdx >= 0) {
          dueSourceMonths.add(`${parts[1]}-${String(monthIdx + 1).padStart(2, '0')}`);
        }
      }
    }
  });

  // Map: "monthKey:memberId" → true if that member's payment is paid/settled.
  const paidMemberMonths = new Map<string, boolean>();
  if (dueSourceMonths.size > 0) {
    const sourceBills = await prisma.monthlyBill.findMany({
      where: { apartmentId, monthKey: { in: Array.from(dueSourceMonths) } },
      include: { memberPayments: true },
    });
    sourceBills.forEach((sb) => {
      sb.memberPayments.forEach((p) => {
        if (p.status === 'paid' || p.amountDue - p.amountPaid <= 0) {
          paidMemberMonths.set(`${sb.monthKey}:${p.memberId}`, true);
        }
      });
    });
  }

  const adjustmentsByMember: Record<string, NonNullable<typeof bill>['adjustments']> = {};
  (bill?.adjustments || []).forEach((a) => {
    // Skip "Due" adjustments whose source-month bill is already paid by this member.
    if (a.label.startsWith(DUE_PREFIX)) {
      const parts = a.label.slice(DUE_PREFIX.length).trim().split(' ');
      if (parts.length === 2) {
        const monthIdx = MONTH_NAMES.indexOf(parts[0]);
        if (monthIdx >= 0) {
          const sourceKey = `${parts[1]}-${String(monthIdx + 1).padStart(2, '0')}`;
          if (paidMemberMonths.has(`${sourceKey}:${a.memberId}`)) return;
        }
      }
    }
    if (!adjustmentsByMember[a.memberId]) adjustmentsByMember[a.memberId] = [];
    adjustmentsByMember[a.memberId].push(a);
  });

  const useSnapshot =
    bill?.isLocked && snapshot
      ? {
          members: (snapshot.members as typeof config.members) || config.members,
          fixedCosts: (snapshot.fixedCosts as typeof config.fixedCosts) || config.fixedCosts,
          optionalCosts: (snapshot.optionalCosts as typeof config.optionalCosts) || config.optionalCosts,
          optInMatrix: (snapshot.optInMatrix as typeof config.optInMatrix) || config.optInMatrix,
          rentSplits: (snapshot.rentSplits as typeof config.rentSplits) || config.rentSplits,
        }
      : undefined;

  const calculation = calculateBill({
    members: config.members,
    fixedCosts: config.fixedCosts,
    optionalCosts: config.optionalCosts,
    optInMatrix: config.optInMatrix,
    rentSplits: config.rentSplits,
    electricity,
    mealCosts,
    adjustments: adjustmentsByMember as Record<
      string,
      { id: string; memberId: string; type: 'lend' | 'borrow'; label: string; amount: number }[]
    >,
    useSnapshot,
  });

  const activeMembers = config.members.filter((m) => m.isActive !== false);
  const optionalCostDetails = config.optionalCosts.map((oc) => {
    const optedInMemberIds = activeMembers
      .filter((m) => config.optInMatrix[oc.id]?.[m.id] !== false)
      .map((m) => m.id);
    const optedInCount = optedInMemberIds.length;
    const perHead = optedInCount > 0 ? ceilPerHead(oc.amount, optedInCount) : 0;
    return {
      id: oc.id,
      name: oc.name,
      amount: oc.amount,
      optedInMemberIds,
      optedInCount,
      perHead,
    };
  });

  return {
    calculation,
    bill: bill
      ? { isLocked: bill.isLocked, lockedAt: bill.lockedAt, electricity: bill.electricity }
      : null,
    optionalCostNames: config.optionalCosts,
    optionalCostDetails,
    optInMatrix: config.optInMatrix,
  };
}

export async function getBillCalculation(apartmentId: string, monthKey: string) {
  const result = await computeBillCalculation(apartmentId, monthKey);
  if (result?.bill?.isLocked) {
    return unstable_cache(
      async () => computeBillCalculation(apartmentId, monthKey),
      ['bill-calculation', apartmentId, monthKey],
      {
        revalidate: 300,
        tags: [billCalcCacheTag(apartmentId, monthKey)],
      },
    )();
  }
  return result;
}
