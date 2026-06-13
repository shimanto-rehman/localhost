import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAptSession,
  requireMemberSession,
  jsonOk,
  handleApiError,
} from '@/lib/api-helpers';
import { runMonthlyJobsForApartment } from '@/lib/monthly-jobs';

export async function GET(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const memberSession = await requireMemberSession(req);

    await runMonthlyJobsForApartment(apt.apartmentId);

    const notifications = await prisma.notification.findMany({
      where: { apartmentId: apt.apartmentId, memberId: memberSession.memberId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        apartmentId: apt.apartmentId,
        memberId: memberSession.memberId,
        readAt: null,
      },
    });

    return jsonOk({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        href: n.href,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
        meta: n.meta,
      })),
      unreadCount,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const memberSession = await requireMemberSession(req);
    const body = await req.json().catch(() => ({}));
    const markAll = body.markAll === true;

    if (markAll) {
      await prisma.notification.updateMany({
        where: {
          apartmentId: apt.apartmentId,
          memberId: memberSession.memberId,
          readAt: null,
        },
        data: { readAt: new Date() },
      });
      return jsonOk({ success: true });
    }

    const id = body.id as string | undefined;
    if (!id) return jsonOk({ success: false });

    await prisma.notification.updateMany({
      where: {
        id,
        apartmentId: apt.apartmentId,
        memberId: memberSession.memberId,
      },
      data: { readAt: new Date() },
    });

    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
