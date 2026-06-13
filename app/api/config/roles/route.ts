import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAptSession,
  requireMemberSession,
  requirePermission,
  jsonOk,
  jsonError,
  handleApiError,
} from '@/lib/api-helpers';

export async function PATCH(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    await requirePermission(member, 'assign_roles');

    const { adminMemberId, billManagerId } = await req.json();

    if (adminMemberId) {
      const admin = await prisma.member.findFirst({
        where: { id: adminMemberId, apartmentId: apt.apartmentId, isActive: true },
      });
      if (!admin) return jsonError('Invalid admin member', 400);
    }

    if (billManagerId) {
      const bm = await prisma.member.findFirst({
        where: { id: billManagerId, apartmentId: apt.apartmentId, isActive: true },
      });
      if (!bm) return jsonError('Invalid bill manager', 400);
    }

    await prisma.apartment.update({
      where: { id: apt.apartmentId },
      data: {
        adminMemberId: adminMemberId || undefined,
        billManagerId: billManagerId || undefined,
      },
    });

    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
