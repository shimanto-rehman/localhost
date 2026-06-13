import { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { isValidMonthKey } from '@/lib/utils';
import { getBillSnapshotData } from '@/lib/apartment-data';
import { getMealSummary } from '@/lib/meal-summary';
import { getBillCalculation, billCalcCacheTag } from '@/lib/bill-calculation';
import {
  requireAptSession,
  requireMemberSession,
  requirePermission,
  jsonOk,
  jsonError,
  handleApiError,
  logAudit,
} from '@/lib/api-helpers';
import { createNotificationsForMembers } from '@/lib/notifications';
import { MONTH_NAMES } from '@/lib/constants';
import { parseMonthKey } from '@/lib/utils';

type Params = { params: Promise<{ monthKey: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { monthKey } = await params;
    if (!isValidMonthKey(monthKey)) return jsonError('Invalid month key', 400);

    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    await requirePermission(member, 'lock_bills');

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
      const calc = await getMealSummary(apt.apartmentId, monthKey);
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

    const calcAfterLock = await getBillCalculation(apt.apartmentId, monthKey);
    if (calcAfterLock?.calculation?.results) {
      await prisma.billMemberPayment.createMany({
        data: calcAfterLock.calculation.results.map((r) => ({
          billId: bill.id,
          memberId: r.id,
          status: 'unpaid',
          amountDue: r.total,
          amountPaid: 0,
        })),
        skipDuplicates: true,
      });
    }

    const activeMembers = await prisma.member.findMany({
      where: { apartmentId: apt.apartmentId, isActive: true },
      select: { id: true },
    });
    const monthDate = parseMonthKey(monthKey);
    const monthName = `${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()}`;

    await createNotificationsForMembers(
      apt.apartmentId,
      activeMembers.map((m) => m.id),
      {
        type: 'bill_locked',
        title: `${monthName} bill is ready`,
        body: `The ${monthName} electricity bill has been locked. Check your share and send payment to the Bill Manager.`,
        href: '/bills',
        meta: { monthKey },
      },
    );

    await logAudit(apt.apartmentId, 'BILL_LOCKED', member.memberId, 'bill', bill.id, {
      monthKey,
      electricity,
    });

    revalidateTag(billCalcCacheTag(apt.apartmentId, monthKey));

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
    await requirePermission(member, 'danger_zone');

    await prisma.monthlyBill.updateMany({
      where: { apartmentId: apt.apartmentId, monthKey },
      data: { isLocked: false, lockedAt: null, lockedById: null },
    });

    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
