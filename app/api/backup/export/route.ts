import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAptSession,
  requireMemberSession,
  requirePermission,
  jsonOk,
  handleApiError,
} from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    await requirePermission(member, 'backup_data');

    const apartmentId = apt.apartmentId;
    const [
      apartment,
      members,
      fixedCosts,
      optionalCosts,
      rentSplits,
      monthlyBills,
      mealConfig,
      mealRecords,
      mealShopping,
      mealMonths,
      expenses,
      adjustments,
    ] = await Promise.all([
      prisma.apartment.findUnique({ where: { id: apartmentId } }),
      prisma.member.findMany({ where: { apartmentId } }),
      prisma.fixedCost.findMany({ where: { apartmentId } }),
      prisma.optionalCost.findMany({ where: { apartmentId }, include: { members: true } }),
      prisma.rentSplit.findMany({ where: { apartmentId } }),
      prisma.monthlyBill.findMany({ where: { apartmentId } }),
      prisma.mealConfig.findUnique({ where: { apartmentId } }),
      prisma.mealRecord.findMany({ where: { apartmentId } }),
      prisma.mealShopping.findMany({ where: { apartmentId } }),
      prisma.mealMonth.findMany({ where: { apartmentId } }),
      prisma.expense.findMany({ where: { apartmentId } }),
      prisma.billAdjustment.findMany({
        where: { bill: { apartmentId } },
      }),
    ]);

    const sanitizedMembers = members.map(({ passwordHash, nid, ...m }) => ({
      ...m,
      nid: undefined,
    }));

    const backup = {
      app: 'localhost',
      version: 2,
      exportedAt: new Date().toISOString(),
      data: {
        apartment: {
          ...apartment,
          passwordHash: undefined,
          registrantNid: undefined,
        },
        members: sanitizedMembers,
        fixedCosts,
        optionalCosts,
        rentSplits,
        monthlyBills,
        mealConfig,
        mealRecords,
        mealShopping,
        mealMonths,
        expenses,
        adjustments,
      },
    };

    return new Response(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="localhost-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
