import { NextRequest, NextResponse } from 'next/server';
import { getAptSessionFromRequest, getMemberSessionFromRequest, MemberSession } from './auth';
import type { PermissionKey } from './role-permissions';
import { resolveMemberPermissionKeys } from './role-permissions';

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/** Private HTTP cache for stable read-only API responses (e.g. locked-month bills). */
export function jsonOkCached<T>(data: T, maxAgeSeconds = 3600) {
  const response = NextResponse.json(data);
  response.headers.set(
    'Cache-Control',
    `private, max-age=${maxAgeSeconds}, stale-while-revalidate=120`,
  );
  return response;
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

export async function requirePermission(member: MemberSession, permission: PermissionKey) {
  const keys = await resolveMemberPermissionKeys(member.apartmentId, member.memberId);
  if (!keys.has(permission)) {
    throw new ApiError('You do not have permission for this action', 403);
  }
}

export async function memberCan(member: MemberSession, permission: PermissionKey): Promise<boolean> {
  const keys = await resolveMemberPermissionKeys(member.apartmentId, member.memberId);
  return keys.has(permission);
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
  const prismaCode = (err as { code?: string })?.code;
  if (prismaCode === 'P1001' || prismaCode === 'P1002') {
    return jsonError('Database is temporarily unavailable. Please try again in a moment.', 503);
  }
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
