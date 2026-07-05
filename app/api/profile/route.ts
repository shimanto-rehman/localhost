import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';
import { getMemberSessionFromRequest } from '@/lib/auth';
import { memberCreateSchema, zodFieldErrors } from '@/lib/validation';
import { requireAptSession, requireMemberSession, jsonOk, jsonError, handleApiError } from '@/lib/api-helpers';
import { getMemberProfile } from '@/lib/member-profile';
import { sanitizeMemberForClient } from '@/lib/apartment-data';
import { normalizeMemberPhotoUrl } from '@/lib/member-photo';

export async function GET(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const memberSession = await getMemberSessionFromRequest(req);
    if (!memberSession) {
      return jsonError('Sign in to view your profile', 401);
    }

    const year = Number(req.nextUrl.searchParams.get('year') || new Date().getFullYear());
    const [profile, row, apartment] = await Promise.all([
      getMemberProfile(apt.apartmentId, memberSession.memberId, year),
      prisma.member.findFirst({
        where: { id: memberSession.memberId, apartmentId: apt.apartmentId, isActive: true },
      }),
      prisma.apartment.findUnique({
        where: { id: apt.apartmentId },
        select: { adminMemberId: true, billManagerId: true },
      }),
    ]);

    if (!profile || !row) return jsonError('Profile not found', 404);

    const contact = sanitizeMemberForClient(
      {
        ...row,
        isAdmin: apartment?.adminMemberId === row.id,
        isBillManager: apartment?.billManagerId === row.id,
      },
      true,
    );

    return jsonOk({ ...profile, contact });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const memberSession = await requireMemberSession(req);

    const body = await req.json();
    const parsed = memberCreateSchema.partial().safeParse(body);
    if (!parsed.success) return jsonError('Validation failed', 400, zodFieldErrors(parsed.error));
    const d = parsed.data;

    const existing = await prisma.member.findFirst({
      where: { id: memberSession.memberId, apartmentId: apt.apartmentId, isActive: true },
    });
    if (!existing) return jsonError('Profile not found', 404);

    if (d.email && d.email !== existing.email) {
      const emailTaken = await prisma.member.findFirst({
        where: {
          apartmentId: apt.apartmentId,
          email: d.email,
          id: { not: existing.id },
        },
        select: { id: true },
      });
      if (emailTaken) {
        return jsonError('This email is already used by another member', 400, { email: 'Email already in use' });
      }
    }

    const [member, apartment] = await Promise.all([
      prisma.member.update({
        where: { id: existing.id },
        data: {
          name: d.name ?? existing.name,
          photoUrl: d.photoUrl !== undefined ? (normalizeMemberPhotoUrl(d.photoUrl) ?? null) : existing.photoUrl,
          email: d.email !== undefined ? (d.email || null) : existing.email,
          phone: d.phone !== undefined ? (d.phone || null) : existing.phone,
          nid: d.nid !== undefined ? (d.nid ? encrypt(d.nid) : null) : existing.nid,
        },
      }),
      prisma.apartment.findUnique({
        where: { id: apt.apartmentId },
        select: { adminMemberId: true, billManagerId: true },
      }),
    ]);

    return jsonOk(
      sanitizeMemberForClient(
        {
          ...member,
          isAdmin: apartment?.adminMemberId === member.id,
          isBillManager: apartment?.billManagerId === member.id,
        },
        true,
      ),
    );
  } catch (err) {
    return handleApiError(err);
  }
}
