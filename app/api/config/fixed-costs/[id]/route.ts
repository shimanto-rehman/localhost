import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAptSession,
  requireMemberSession,
  requireAdmin,
  jsonOk,
  handleApiError,
} from '@/lib/api-helpers';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    requireAdmin(member);

    const body = await req.json();
    const cost = await prisma.fixedCost.updateMany({
      where: { id, apartmentId: apt.apartmentId },
      data: {
        name: body.name,
        amount: body.amount,
        inFixedBucket: body.inFixedBucket,
        sortOrder: body.sortOrder,
      },
    });

    return jsonOk({ success: cost.count > 0 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    requireAdmin(member);

    await prisma.fixedCost.updateMany({
      where: { id, apartmentId: apt.apartmentId },
      data: { isActive: false },
    });

    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
