import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAptSession,
  requireMemberSession,
  requireAdmin,
  jsonOk,
  jsonError,
  handleApiError,
  logAudit,
} from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    requireAdmin(member);

    const payload = await req.json();
    const backup = payload.backup || payload;
    if (!backup?.app || backup.app !== 'localhost' || !backup.data) {
      return jsonError('Invalid backup file format', 400);
    }

    const { data } = backup;
    const apartmentId = apt.apartmentId;

    await prisma.$transaction(async (tx) => {
      await tx.billAdjustment.deleteMany({ where: { bill: { apartmentId } } });
      await tx.monthlyBill.deleteMany({ where: { apartmentId } });
      await tx.mealRecord.deleteMany({ where: { apartmentId } });
      await tx.mealShopping.deleteMany({ where: { apartmentId } });
      await tx.mealMonth.deleteMany({ where: { apartmentId } });
      await tx.expense.deleteMany({ where: { apartmentId } });
      await tx.optionalCostMember.deleteMany({
        where: { optionalCost: { apartmentId } },
      });
      await tx.optionalCost.deleteMany({ where: { apartmentId } });
      await tx.fixedCost.deleteMany({ where: { apartmentId } });
      await tx.rentSplit.deleteMany({ where: { apartmentId } });

      if (data.fixedCosts?.length) {
        await tx.fixedCost.createMany({
          data: data.fixedCosts.map((c: { id: string; name: string; amount: number; inFixedBucket: boolean; sortOrder: number; isActive: boolean }) => ({
            id: c.id,
            apartmentId,
            name: c.name,
            amount: c.amount,
            inFixedBucket: c.inFixedBucket,
            sortOrder: c.sortOrder,
            isActive: c.isActive ?? true,
          })),
        });
      }

      if (data.optionalCosts?.length) {
        for (const oc of data.optionalCosts) {
          await tx.optionalCost.create({
            data: {
              id: oc.id,
              apartmentId,
              name: oc.name,
              amount: oc.amount,
              sortOrder: oc.sortOrder,
              isActive: oc.isActive ?? true,
            },
          });
          if (oc.members?.length) {
            await tx.optionalCostMember.createMany({
              data: oc.members.map((m: { memberId: string; optedIn: boolean }) => ({
                optionalCostId: oc.id,
                memberId: m.memberId,
                optedIn: m.optedIn,
              })),
            });
          }
        }
      }

      if (data.rentSplits?.length) {
        await tx.rentSplit.createMany({
          data: data.rentSplits.map((r: { memberId: string; fixedAmount: number | null }) => ({
            apartmentId,
            memberId: r.memberId,
            fixedAmount: r.fixedAmount,
          })),
        });
      }

      if (data.monthlyBills?.length) {
        await tx.monthlyBill.createMany({
          data: data.monthlyBills.map((b: { monthKey: string; electricity: number; isLocked: boolean; lockedAt: string; snapshot: object }) => ({
            apartmentId,
            monthKey: b.monthKey,
            electricity: b.electricity,
            isLocked: b.isLocked,
            lockedAt: b.lockedAt ? new Date(b.lockedAt) : null,
            snapshot: b.snapshot || {},
          })),
        });
      }

      if (data.expenses?.length) {
        await tx.expense.createMany({
          data: data.expenses.map((e: { memberId: string; monthKey: string; itemName: string; price: number; category: string }) => ({
            apartmentId,
            memberId: e.memberId,
            monthKey: e.monthKey,
            itemName: e.itemName,
            price: e.price,
            category: e.category,
          })),
        });
      }
    });

    await logAudit(apartmentId, 'BACKUP_RESTORE', member.memberId);
    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
