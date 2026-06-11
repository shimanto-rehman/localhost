import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidMonthKey } from '@/lib/utils';
import { getBillSnapshotData } from '@/lib/apartment-data';
import { calculateMealCosts } from '@/lib/calculations/meals';
import {
  requireAptSession,
  requireMemberSession,
  requireBillManagerOrAdmin,
  jsonOk,
  jsonError,
  handleApiError,
} from '@/lib/api-helpers';

type Params = { params: Promise<{ monthKey: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { monthKey } = await params;
    if (!isValidMonthKey(monthKey)) return jsonError('Invalid month key', 400);

    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    requireBillManagerOrAdmin(member);

    const existing = await prisma.monthlyBill.findUnique({
      where: { apartmentId_monthKey: { apartmentId: apt.apartmentId, monthKey } },
    });
    if (existing?.isLocked) return jsonError('Bill already locked', 403);

    const body = await req.json();
    const electricity = body.electricity;
    if (electricity == null || electricity < 0) {
      return jsonError('Electricity amount required', 400);
    }

    const snapshotData = await getBillSnapshotData(apt.apartmentId);
    const mealMonth = await prisma.mealMonth.findUnique({
      where: { apartmentId_monthKey: { apartmentId: apt.apartmentId, monthKey } },
    });

    let mealCosts: Record<string, number> = {};
    if (mealMonth?.isFinalized && mealMonth.snapshot) {
      const snap = mealMonth.snapshot as { memberMealCosts?: Record<string, number> };
      mealCosts = snap.memberMealCosts || {};
    } else {
      const [records, shopping] = await Promise.all([
        prisma.mealRecord.findMany({
          where: {
            apartmentId: apt.apartmentId,
            mealDate: {
              gte: new Date(`${monthKey}-01`),
              lte: new Date(new Date(`${monthKey}-01`).getFullYear(), new Date(`${monthKey}-01`).getMonth() + 1, 0),
            },
          },
        }),
        prisma.mealShopping.findMany({
          where: { apartmentId: apt.apartmentId, monthKey },
        }),
      ]);
      const mealConfig = await prisma.mealConfig.findUnique({
        where: { apartmentId: apt.apartmentId },
      });
      const calc = calculateMealCosts(
        records.map((r) => ({
          memberId: r.memberId,
          mealDate: r.mealDate.toISOString().slice(0, 10),
          mealSlot: r.mealSlot,
          isConfirmed: r.isConfirmed,
        })),
        shopping.map((s) => ({ memberId: s.memberId, amount: s.amount })),
        mealConfig?.rateOverride
      );
      mealCosts = calc.memberMealCosts;
    }

    const snapshot = JSON.parse(JSON.stringify({
      ...snapshotData,
      electricity,
      mealCosts,
      lockedAt: new Date().toISOString(),
    }));

    const bill = await prisma.monthlyBill.upsert({
      where: { apartmentId_monthKey: { apartmentId: apt.apartmentId, monthKey } },
      create: {
        apartmentId: apt.apartmentId,
        monthKey,
        electricity,
        isLocked: true,
        lockedAt: new Date(),
        lockedById: member.memberId,
        snapshot,
      },
      update: {
        electricity,
        isLocked: true,
        lockedAt: new Date(),
        lockedById: member.memberId,
        snapshot,
      },
    });

    return jsonOk(bill);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { monthKey } = await params;
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    if (!member.isAdmin) return jsonError('Admin access required', 403);

    await prisma.monthlyBill.updateMany({
      where: { apartmentId: apt.apartmentId, monthKey },
      data: { isLocked: false, lockedAt: null, lockedById: null },
    });

    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
