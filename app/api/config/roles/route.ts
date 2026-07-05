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

    // Run member validations in parallel
    const [admin, bm] = await Promise.all([
      adminMemberId
        ? prisma.member.findFirst({
            where: { id: adminMemberId, apartmentId: apt.apartmentId, isActive: true },
          })
        : Promise.resolve(null),
      billManagerId
        ? prisma.member.findFirst({
            where: { id: billManagerId, apartmentId: apt.apartmentId, isActive: true },
          })
        : Promise.resolve(null),
    ]);

    if (adminMemberId && !admin) return jsonError('Invalid admin member', 400);
    if (adminMemberId && admin && (!admin.email?.trim() || !admin.phone?.trim())) {
      return jsonError('Member must have email and phone number in their profile to be admin', 400);
    }
    if (billManagerId && !bm) return jsonError('Invalid bill manager', 400);

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
