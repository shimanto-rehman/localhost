import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';
import { defaultPasswordHash } from '@/lib/password';
import { memberCreateSchema, zodFieldErrors } from '@/lib/validation';
import {
  requireAptSession,
  requireMemberSession,
  requirePermission,
  jsonOk,
  jsonError,
  handleApiError,
} from '@/lib/api-helpers';
import { sanitizeMemberForClient } from '@/lib/apartment-data';
import { seedMealMemberSlotsForMember } from '@/lib/meal-member-slots';

export async function GET(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const members = await prisma.member.findMany({
      where: { apartmentId: apt.apartmentId },
      orderBy: { createdAt: 'asc' },
    });
    const apartment = await prisma.apartment.findUnique({
      where: { id: apt.apartmentId },
    });
    return jsonOk(
      members.map((m) =>
        sanitizeMemberForClient({
          ...m,
          isAdmin: apartment?.adminMemberId === m.id,
          isBillManager: apartment?.billManagerId === m.id,
        })
      )
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const memberSession = await requireMemberSession(req);
    await requirePermission(memberSession, 'manage_members');

    const body = await req.json();
    const parsed = memberCreateSchema.safeParse(body);
    if (!parsed.success) return jsonError('Validation failed', 400, zodFieldErrors(parsed.error));
    const d = parsed.data;

    const passwordHash = await defaultPasswordHash();
    const member = await prisma.member.create({
      data: {
        apartmentId: apt.apartmentId,
        name: d.name,
        photoUrl: d.photoUrl,
        email: d.email || null,
        phone: d.phone || null,
        nid: d.nid ? encrypt(d.nid) : null,
        hometown: d.hometown || null,
        country: d.country || 'Bangladesh',
        moveInDate: d.moveInDate ? new Date(d.moveInDate) : null,
        passwordHash,
      },
    });

    const optionalCosts = await prisma.optionalCost.findMany({
      where: { apartmentId: apt.apartmentId, isActive: true },
    });
    await prisma.optionalCostMember.createMany({
      data: optionalCosts.map((oc) => ({
        optionalCostId: oc.id,
        memberId: member.id,
        optedIn: true,
      })),
    });

    await seedMealMemberSlotsForMember(apt.apartmentId, member.id);

    return jsonOk(sanitizeMemberForClient(member), 201);
  } catch (err) {
    return handleApiError(err);
  }
}
