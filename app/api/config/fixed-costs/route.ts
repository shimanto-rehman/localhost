import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { costItemSchema, zodFieldErrors } from '@/lib/validation';
import {
  requireAptSession,
  requireMemberSession,
  requireAdmin,
  jsonOk,
  jsonError,
  handleApiError,
} from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const costs = await prisma.fixedCost.findMany({
      where: { apartmentId: apt.apartmentId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return jsonOk(costs);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    requireAdmin(member);

    const body = await req.json();
    const parsed = costItemSchema.safeParse(body);
    if (!parsed.success) return jsonError('Validation failed', 400, zodFieldErrors(parsed.error));

    const maxOrder = await prisma.fixedCost.aggregate({
      where: { apartmentId: apt.apartmentId },
      _max: { sortOrder: true },
    });

    const cost = await prisma.fixedCost.create({
      data: {
        apartmentId: apt.apartmentId,
        name: parsed.data.name,
        amount: parsed.data.amount,
        inFixedBucket: body.inFixedBucket ?? false,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });

    return jsonOk(cost, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
