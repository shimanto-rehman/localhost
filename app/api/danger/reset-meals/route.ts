import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAptSession,
  requireMemberSession,
  requirePermission,
  jsonOk,
  handleApiError,
  logAudit,
} from '@/lib/api-helpers';
import { requireDangerZonePassword } from '@/lib/danger-zone';

export async function POST(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    await requirePermission(member, 'danger_zone');

    const { password } = await req.json();
    const passwordError = await requireDangerZonePassword(apt.apartmentId, password);
    if (passwordError) return passwordError;

    await prisma.$transaction([
      prisma.mealRecord.deleteMany({ where: { apartmentId: apt.apartmentId } }),
      prisma.mealShopping.deleteMany({ where: { apartmentId: apt.apartmentId } }),
      prisma.mealMonth.deleteMany({ where: { apartmentId: apt.apartmentId } }),
    ]);

    await logAudit(apt.apartmentId, 'RESET_MEALS', member.memberId);
    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
