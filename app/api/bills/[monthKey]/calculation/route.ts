import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidMonthKey } from '@/lib/utils';
import { getApartmentConfig } from '@/lib/apartment-data';
import { calculateBill } from '@/lib/calculations/bills';
import { requireAptSession, jsonOk, jsonError, handleApiError } from '@/lib/api-helpers';

type Params = { params: Promise<{ monthKey: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { monthKey } = await params;
    if (!isValidMonthKey(monthKey)) return jsonError('Invalid month key', 400);

    const apt = await requireAptSession(req);
    const [bill, config] = await Promise.all([
      prisma.monthlyBill.findUnique({
        where: { apartmentId_monthKey: { apartmentId: apt.apartmentId, monthKey } },
        include: { adjustments: true },
      }),
      getApartmentConfig(apt.apartmentId),
    ]);

    if (!config) return jsonError('Apartment not found', 404);

    const electricity = bill?.electricity ?? null;
    const snapshot = bill?.snapshot as Record<string, unknown> | null;
    const mealCosts = (snapshot?.mealCosts as Record<string, number>) || {};

    const adjustmentsByMember: Record<string, NonNullable<typeof bill>['adjustments']> = {};
    (bill?.adjustments || []).forEach((a) => {
      if (!adjustmentsByMember[a.memberId]) adjustmentsByMember[a.memberId] = [];
      adjustmentsByMember[a.memberId].push(a);
    });

    const useSnapshot = bill?.isLocked && snapshot ? {
      members: (snapshot.members as typeof config.members) || config.members,
      fixedCosts: (snapshot.fixedCosts as typeof config.fixedCosts) || config.fixedCosts,
      optionalCosts: (snapshot.optionalCosts as typeof config.optionalCosts) || config.optionalCosts,
      optInMatrix: (snapshot.optInMatrix as typeof config.optInMatrix) || config.optInMatrix,
      rentSplits: (snapshot.rentSplits as typeof config.rentSplits) || config.rentSplits,
    } : undefined;

    const calc = calculateBill({
      members: config.members,
      fixedCosts: config.fixedCosts,
      optionalCosts: config.optionalCosts,
      optInMatrix: config.optInMatrix,
      rentSplits: config.rentSplits,
      electricity,
      mealCosts,
      adjustments: adjustmentsByMember as Record<string, { id: string; memberId: string; type: 'lend' | 'borrow'; label: string; amount: number }[]>,
      useSnapshot,
    });

    return jsonOk({
      calculation: calc,
      bill: bill ? { isLocked: bill.isLocked, lockedAt: bill.lockedAt, electricity: bill.electricity } : null,
      optionalCostNames: config.optionalCosts,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
