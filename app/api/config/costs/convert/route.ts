import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAptSession,
  requireMemberSession,
  requireAdmin,
  jsonOk,
  jsonError,
  handleApiError,
} from '@/lib/api-helpers';

type TargetZone = 'bucket' | 'fixed' | 'variable';

export async function POST(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    requireAdmin(member);

    const body = await req.json() as {
      sourceKind: 'fixed' | 'optional';
      id: string;
      targetZone: TargetZone;
    };

    const { sourceKind, id, targetZone } = body;
    if (!id || !sourceKind || !targetZone) {
      return jsonError('sourceKind, id, and targetZone are required', 400);
    }

    if (sourceKind === 'fixed' && targetZone === 'variable') {
      const fixed = await prisma.fixedCost.findFirst({
        where: { id, apartmentId: apt.apartmentId, isActive: true },
      });
      if (!fixed) return jsonError('Fixed cost not found', 404);

      const members = await prisma.member.findMany({
        where: { apartmentId: apt.apartmentId, isActive: true },
      });
      const maxOrder = await prisma.optionalCost.aggregate({
        where: { apartmentId: apt.apartmentId },
        _max: { sortOrder: true },
      });

      await prisma.$transaction(async (tx) => {
        const optional = await tx.optionalCost.create({
          data: {
            apartmentId: apt.apartmentId,
            name: fixed.name,
            amount: fixed.amount,
            sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
          },
        });
        if (members.length) {
          await tx.optionalCostMember.createMany({
            data: members.map((m) => ({
              optionalCostId: optional.id,
              memberId: m.id,
              optedIn: true,
            })),
          });
        }
        await tx.fixedCost.updateMany({
          where: { id, apartmentId: apt.apartmentId },
          data: { isActive: false },
        });
      });

      return jsonOk({ success: true, convertedTo: 'optional' });
    }

    if (sourceKind === 'optional' && (targetZone === 'bucket' || targetZone === 'fixed')) {
      const optional = await prisma.optionalCost.findFirst({
        where: { id, apartmentId: apt.apartmentId, isActive: true },
      });
      if (!optional) return jsonError('Optional cost not found', 404);

      const maxOrder = await prisma.fixedCost.aggregate({
        where: { apartmentId: apt.apartmentId },
        _max: { sortOrder: true },
      });

      await prisma.$transaction(async (tx) => {
        await tx.fixedCost.create({
          data: {
            apartmentId: apt.apartmentId,
            name: optional.name,
            amount: optional.amount,
            inFixedBucket: targetZone === 'bucket',
            sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
          },
        });
        await tx.optionalCost.updateMany({
          where: { id, apartmentId: apt.apartmentId },
          data: { isActive: false },
        });
      });

      return jsonOk({ success: true, convertedTo: 'fixed' });
    }

    if (sourceKind === 'fixed' && (targetZone === 'bucket' || targetZone === 'fixed')) {
      const fixed = await prisma.fixedCost.findFirst({
        where: { id, apartmentId: apt.apartmentId, isActive: true },
      });
      if (!fixed) return jsonError('Fixed cost not found', 404);

      const inFixedBucket = targetZone === 'bucket';
      if (fixed.inFixedBucket === inFixedBucket) {
        return jsonOk({ success: true, moved: false });
      }

      await prisma.fixedCost.updateMany({
        where: { id, apartmentId: apt.apartmentId },
        data: { inFixedBucket },
      });

      return jsonOk({ success: true, moved: true });
    }

    return jsonError('Invalid conversion', 400);
  } catch (err) {
    return handleApiError(err);
  }
}
