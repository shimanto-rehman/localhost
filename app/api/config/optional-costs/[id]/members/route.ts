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

    const { matrix } = await req.json() as { matrix: Record<string, boolean> };

    await Promise.all(
      Object.entries(matrix).map(([memberId, optedIn]) =>
        prisma.optionalCostMember.upsert({
          where: {
            optionalCostId_memberId: { optionalCostId: id, memberId },
          },
          create: { optionalCostId: id, memberId, optedIn },
          update: { optedIn },
        })
      )
    );

    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
