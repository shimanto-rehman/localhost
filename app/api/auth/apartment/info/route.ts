import { NextRequest } from 'next/server';
import { formatAddress } from '@/lib/utils';
import { requireAptSession, jsonOk, handleApiError } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAptSession(req);
    const apartment = await prisma.apartment.findUnique({
      where: { id: session.apartmentId },
      include: { members: { where: { isActive: true }, take: 5 } },
    });
    if (!apartment) return jsonOk(null);

    return jsonOk({
      id: apartment.id,
      registrationId: apartment.registrationId,
      name: apartment.name,
      address: formatAddress(apartment),
      addressRoad: apartment.addressRoad,
      addressCity: apartment.addressCity,
      addressPostal: apartment.addressPostal,
      addressCountry: apartment.addressCountry,
      aptFloor: apartment.aptFloor,
      aptType: apartment.aptType,
      moveInDate: apartment.moveInDate?.toISOString().slice(0, 10),
      adminMemberId: apartment.adminMemberId,
      billManagerId: apartment.billManagerId,
      members: apartment.members.map((m) => ({
        id: m.id,
        name: m.name,
        photoUrl: m.photoUrl,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
