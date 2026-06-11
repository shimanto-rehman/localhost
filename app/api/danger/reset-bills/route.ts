import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAptSession,
  requireMemberSession,
  requireAdmin,
  jsonOk,
  handleApiError,
  logAudit,
} from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    requireAdmin(member);

    await prisma.$transaction([
      prisma.billAdjustment.deleteMany({ where: { bill: { apartmentId: apt.apartmentId } } }),
      prisma.monthlyBill.deleteMany({ where: { apartmentId: apt.apartmentId } }),
    ]);

    await logAudit(apt.apartmentId, 'RESET_BILLS', member.memberId);
    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
