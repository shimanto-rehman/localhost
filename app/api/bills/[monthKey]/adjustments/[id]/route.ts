import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAptSession,
  requireMemberSession,
  requireBillManagerOrAdmin,
  requirePermission,
  jsonOk,
  handleApiError,
} from '@/lib/api-helpers';

type Params = { params: Promise<{ monthKey: string; id: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { monthKey, id } = await params;
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    await requirePermission(member, 'bill_adjustments');

    const bill = await prisma.monthlyBill.findUnique({
      where: { apartmentId_monthKey: { apartmentId: apt.apartmentId, monthKey } },
    });
    if (!bill) return jsonOk({ success: true });

    await prisma.billAdjustment.deleteMany({
      where: { id, billId: bill.id },
    });

    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
