import { prisma } from './prisma';

export type NotificationType =
  | 'bill_paid'
  | 'bill_partial'
  | 'bill_due_carried'
  | 'electricity_reminder'
  | 'bill_locked'
  | 'system'
  | 'bug_report';

export async function createNotification(params: {
  apartmentId: string;
  memberId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
  meta?: Record<string, unknown>;
}) {
  return prisma.notification.create({
    data: {
      apartmentId: params.apartmentId,
      memberId: params.memberId,
      type: params.type,
      title: params.title,
      body: params.body.slice(0, 500),
      href: params.href,
      meta: JSON.parse(JSON.stringify(params.meta || {})),
    },
  });
}

export async function createNotificationsForMembers(
  apartmentId: string,
  memberIds: string[],
  payload: Omit<Parameters<typeof createNotification>[0], 'apartmentId' | 'memberId'>,
) {
  if (!memberIds.length) return;
  await prisma.notification.createMany({
    data: memberIds.map((memberId) => ({
      apartmentId,
      memberId,
      type: payload.type,
      title: payload.title,
      body: payload.body.slice(0, 500),
      href: payload.href,
      meta: JSON.parse(JSON.stringify(payload.meta || {})),
    })),
  });
}
