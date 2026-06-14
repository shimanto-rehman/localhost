import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAptSession,
  requireMemberSession,
  requirePermission,
  jsonOk,
  jsonError,
  handleApiError,
  logAudit,
} from '@/lib/api-helpers';
import { clearAptCookie, clearMemberCookie } from '@/lib/auth';
import { requireDangerZonePassword } from '@/lib/danger-zone';

export async function POST(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    await requirePermission(member, 'danger_zone');

    const { password } = await req.json();
    const passwordError = await requireDangerZonePassword(apt.apartmentId, password);
    if (passwordError) return passwordError;

    const apartment = await prisma.apartment.findUnique({
      where: { id: apt.apartmentId },
    });
    if (!apartment) return jsonError('Apartment not found', 404);

    await logAudit(apartment.id, 'DELETE_APARTMENT', member.memberId);
    await prisma.apartment.delete({ where: { id: apartment.id } });

    const response = jsonOk({
      success: true,
      redirect: '/login',
      message: 'Apartment deleted permanently.',
    });
    clearAptCookie(response);
    clearMemberCookie(response);
    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
