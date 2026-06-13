import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAptSession,
  requireMemberSession,
  jsonOk,
  handleApiError,
} from '@/lib/api-helpers';

const ACTION_LABELS: Record<string, string> = {
  BILL_PAYMENT_UPDATED: 'Bill payment updated',
  BILL_DUE_CARRIED: 'Outstanding balance carried forward',
  BILL_LOCKED: 'Monthly bill locked',
  MONTH_OPEN_JOB: 'Month opened (automated)',
  RESET_BILLS: 'All bills reset',
  RESET_MEALS: 'All meals reset',
  RESET_ALL: 'Full data reset',
  BACKUP_RESTORE: 'Backup restored',
  PASSWORD_SET_BY_ADMIN: 'Password changed by admin',
  PASSWORD_RESET_REQUEST: 'Password reset requested',
  APARTMENT_PASSWORD_RESET_REQUEST: 'Apartment password reset requested',
  BUG_REPORT: 'Bug report submitted',
};

export async function GET(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    await requireMemberSession(req);

    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || 40), 100);
    const cursor = req.nextUrl.searchParams.get('cursor');

    const events = await prisma.auditEvent.findMany({
      where: { apartmentId: apt.apartmentId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        actor: { select: { id: true, name: true, photoUrl: true } },
      },
    });

    const hasMore = events.length > limit;
    const items = hasMore ? events.slice(0, limit) : events;

    return jsonOk({
      events: items.map((e) => ({
        id: e.id,
        action: e.action,
        actionLabel: ACTION_LABELS[e.action] || e.action.replace(/_/g, ' '),
        targetType: e.targetType,
        targetId: e.targetId,
        meta: e.meta,
        createdAt: e.createdAt.toISOString(),
        actor: e.actor
          ? { id: e.actor.id, name: e.actor.name, photoUrl: e.actor.photoUrl }
          : null,
        isSystem: !e.actorMemberId,
        isError: e.action.includes('ERROR') || (e.meta as { level?: string })?.level === 'error',
      })),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
