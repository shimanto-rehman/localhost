import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatAddress } from '@/lib/utils';
import { getMemberSessionFromRequest } from '@/lib/auth';
import { requireAptSession, jsonOk, handleApiError } from '@/lib/api-helpers';
import { resolveMemberPermissionKeys } from '@/lib/role-permissions';

/** Lightweight app shell: apartment + slim member list + session. Full member PII loads via /api/config on Settings. */
export async function GET(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const memberSession = await getMemberSessionFromRequest(req);

    const [apartment, members] = await Promise.all([
      prisma.apartment.findUnique({
        where: { id: apt.apartmentId },
        select: {
          id: true,
          registrationId: true,
          name: true,
          addressRoad: true,
          addressCity: true,
          addressPostal: true,
          addressCountry: true,
          aptFloor: true,
          aptType: true,
          moveInDate: true,
          adminMemberId: true,
          billManagerId: true,
          currency: true,
        },
      }),
      prisma.member.findMany({
        where: { apartmentId: apt.apartmentId, isActive: true },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          photoUrl: true,
          isActive: true,
        },
      }),
    ]);

    if (!apartment) return jsonOk({ apartment: null, members: [], member: null });

    const shellMembers = members.map((m) => ({
      id: m.id,
      name: m.name,
      photoUrl: m.photoUrl,
      isActive: m.isActive,
      isAdmin: apartment.adminMemberId === m.id,
      isBillManager: apartment.billManagerId === m.id,
    }));

    let member = null;
    if (memberSession) {
      const row = members.find((m) => m.id === memberSession.memberId);
      if (row?.isActive) {
        const permissionKeys = await resolveMemberPermissionKeys(
          apt.apartmentId,
          memberSession.memberId,
        );
        member = {
          id: row.id,
          name: row.name,
          photoUrl: row.photoUrl,
          isActive: row.isActive,
          isAdmin: memberSession.isAdmin,
          isBillManager: memberSession.isBillManager,
          permissions: Array.from(permissionKeys),
        };
      }
    }

    return jsonOk({
      apartment: {
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
        currency: apartment.currency,
        members: shellMembers.filter((m) => m.isActive).slice(0, 5).map((m) => ({
          id: m.id,
          name: m.name,
          photoUrl: m.photoUrl,
        })),
      },
      members: shellMembers,
      member,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
