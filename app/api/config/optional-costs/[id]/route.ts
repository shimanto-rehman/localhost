import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAptSession,
  requireMemberSession,
  requirePermission,
  jsonOk,
  handleApiError,
} from '@/lib/api-helpers';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    await requirePermission(member, 'manage_costs');

    const body = await req.json();
    await prisma.optionalCost.updateMany({
      where: { id, apartmentId: apt.apartmentId },
      data: { name: body.name, amount: body.amount, sortOrder: body.sortOrder },
    });

    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    await requirePermission(member, 'manage_costs');

    await prisma.optionalCost.updateMany({
      where: { id, apartmentId: apt.apartmentId },
      data: { isActive: false },
    });

    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
