import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';
import { memberCreateSchema, zodFieldErrors } from '@/lib/validation';
import {
  requireAptSession,
  requireMemberSession,
  requirePermission,
  jsonOk,
  jsonError,
  handleApiError,
} from '@/lib/api-helpers';
import { deleteMemberFromApartment } from '@/lib/delete-member';
import { sanitizeMemberForClient } from '@/lib/apartment-data';
import { normalizeMemberPhotoUrl } from '@/lib/member-photo';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const apt = await requireAptSession(req);
    const memberSession = await requireMemberSession(req);
    await requirePermission(memberSession, 'manage_members');

    const body = await req.json();
    const parsed = memberCreateSchema.partial().safeParse(body);
    if (!parsed.success) return jsonError('Validation failed', 400, zodFieldErrors(parsed.error));
    const d = parsed.data;

    const existing = await prisma.member.findFirst({
      where: { id, apartmentId: apt.apartmentId },
    });
    if (!existing) return jsonError('Member not found', 404);

    const member = await prisma.member.update({
      where: { id },
      data: {
        name: d.name ?? existing.name,
        photoUrl: d.photoUrl !== undefined ? (normalizeMemberPhotoUrl(d.photoUrl) ?? null) : existing.photoUrl,
        email: d.email !== undefined ? (d.email || null) : existing.email,
        phone: d.phone !== undefined ? (d.phone || null) : existing.phone,
        nid: d.nid !== undefined ? (d.nid ? encrypt(d.nid) : null) : existing.nid,
        hometown: d.hometown !== undefined ? (d.hometown || null) : existing.hometown,
        country: d.country ?? existing.country,
        moveInDate: d.moveInDate !== undefined
          ? (d.moveInDate ? new Date(d.moveInDate) : null)
          : existing.moveInDate,
        isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
      },
    });

    const apartment = await prisma.apartment.findUnique({ where: { id: apt.apartmentId } });
    return jsonOk(
      sanitizeMemberForClient({
        ...member,
        isAdmin: apartment?.adminMemberId === member.id,
        isBillManager: apartment?.billManagerId === member.id,
      }, body.revealNid)
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const apt = await requireAptSession(req);
    const memberSession = await requireMemberSession(req);
    await requirePermission(memberSession, 'manage_members');

    const deleted = await deleteMemberFromApartment(apt.apartmentId, id);
    if (!deleted) return jsonError('Member not found', 404);

    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
