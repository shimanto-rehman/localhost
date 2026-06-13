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
    const splits = await prisma.rentSplit.findMany({
      where: { apartmentId: apt.apartmentId },
    });
    return jsonOk(splits);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    await requirePermission(member, 'manage_rent_split');

    const { splits } = await req.json() as {
      splits: { memberId: string; fixedAmount: number | null }[];
    };

    await prisma.$transaction(async (tx) => {
      await tx.rentSplit.deleteMany({ where: { apartmentId: apt.apartmentId } });
      const toCreate = splits.filter((s) => s.fixedAmount != null);
      if (toCreate.length) {
        await tx.rentSplit.createMany({
          data: toCreate.map((s) => ({
            apartmentId: apt.apartmentId,
            memberId: s.memberId,
            fixedAmount: s.fixedAmount,
          })),
        });
      }
    });

    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
