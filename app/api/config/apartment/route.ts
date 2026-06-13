import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAptSession,
  requireMemberSession,
  requirePermission,
  jsonOk,
  handleApiError,
} from '@/lib/api-helpers';

export async function PATCH(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    await requirePermission(member, 'manage_apartment');

    const body = await req.json();
    const apartment = await prisma.apartment.update({
      where: { id: apt.apartmentId },
      data: {
        addressRoad: body.addressRoad,
        addressPostal: body.addressPostal,
        addressCity: body.addressCity,
        addressCountry: body.addressCountry,
        aptFloor: body.aptFloor,
        aptType: body.aptType,
        moveInDate: body.moveInDate ? new Date(body.moveInDate) : undefined,
      },
    });

    return jsonOk({ success: true, apartment });
  } catch (err) {
    return handleApiError(err);
  }
}
