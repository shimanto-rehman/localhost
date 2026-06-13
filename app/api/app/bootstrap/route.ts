import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatAddress } from '@/lib/utils';
import { getMemberSessionFromRequest } from '@/lib/auth';
import { requireAptSession, jsonOk, handleApiError } from '@/lib/api-helpers';
import { sanitizeMemberForClient } from '@/lib/apartment-data';
import { resolveMemberPermissionKeys } from '@/lib/role-permissions';

/** Single round-trip for app shell: apartment, members, and member session. */
export async function GET(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const memberSession = await getMemberSessionFromRequest(req);

    // select only what the client shell needs — never password hashes or raw PII
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
          members: {
            where: { isActive: true },
            take: 5,
            select: { id: true, name: true, photoUrl: true },
          },
        },
      }),
      prisma.member.findMany({
        where: { apartmentId: apt.apartmentId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          photoUrl: true,
          email: true,
          phone: true,
          nid: true,
          hometown: true,
          country: true,
          moveInDate: true,
          isActive: true,
        },
      }),
    ]);

    if (!apartment) return jsonOk({ apartment: null, members: [], member: null });

    // Run monthly jobs (1st-day reminders, carry-forward dues) on first bootstrap of the month.
    try {
      const { runMonthlyJobsForApartment } = await import('@/lib/monthly-jobs');
      await runMonthlyJobsForApartment(apt.apartmentId);
    } catch (jobErr) {
      console.error('Monthly job error:', jobErr);
    }

    let member = null;
    if (memberSession) {
      const row = await prisma.member.findUnique({
        where: { id: memberSession.memberId },
        select: { id: true, name: true, photoUrl: true, isActive: true },
      });
      if (row?.isActive) {
        const permissionKeys = await resolveMemberPermissionKeys(
          apt.apartmentId,
          memberSession.memberId,
        );
        member = {
          ...row,
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
        members: apartment.members.map((m) => ({
          id: m.id,
          name: m.name,
          photoUrl: m.photoUrl,
        })),
      },
      members: members.map((m) =>
        sanitizeMemberForClient({
          ...m,
          isAdmin: apartment.adminMemberId === m.id,
          isBillManager: apartment.billManagerId === m.id,
        }),
      ),
      member,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
