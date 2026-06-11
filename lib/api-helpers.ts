import { NextRequest, NextResponse } from 'next/server';
import { getAptSessionFromRequest, getMemberSessionFromRequest, MemberSession } from './auth';

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400, fields?: Record<string, string>) {
  return NextResponse.json({ error: message, fields }, { status });
}

export async function requireAptSession(req: NextRequest) {
  const session = await getAptSessionFromRequest(req);
  if (!session) {
    throw new ApiError('Apartment session required', 401);
  }
  return session;
}

export async function requireMemberSession(req: NextRequest) {
  const apt = await requireAptSession(req);
  const member = await getMemberSessionFromRequest(req);
  if (!member || member.apartmentId !== apt.apartmentId) {
    throw new ApiError('Please sign in to continue', 401);
  }
  return member;
}

export function requireAdmin(member: MemberSession) {
  if (!member.isAdmin) throw new ApiError('Admin access required', 403);
}

export function requireBillManagerOrAdmin(member: MemberSession) {
  if (!member.isAdmin && !member.isBillManager) {
    throw new ApiError('Admin or Bill Manager access required', 403);
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(err: unknown) {
  if (err instanceof ApiError) {
    return jsonError(err.message, err.status, err.fields);
  }
  console.error(err);
  return jsonError('Something went wrong. Please try again.', 500);
}

export async function logAudit(
  apartmentId: string,
  action: string,
  actorMemberId?: string,
  targetType?: string,
  targetId?: string,
  meta?: Record<string, unknown>
) {
  const { prisma } = await import('./prisma');
  await prisma.auditEvent.create({
    data: {
      apartmentId,
      actorMemberId,
      action,
      targetType,
      targetId,
      meta: JSON.parse(JSON.stringify(meta || {})),
    },
  });
}
