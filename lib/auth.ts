import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import {
  APT_SESSION_COOKIE,
  MEMBER_SESSION_COOKIE,
  APT_SESSION_DAYS,
  MEMBER_SESSION_DAYS,
} from './constants';
import crypto from 'crypto';

export type AptSession = { apartmentId: string; type: 'apartment' };
export type MemberSession = {
  apartmentId: string;
  memberId: string;
  jti: string;
  type: 'member';
  isAdmin: boolean;
  isBillManager: boolean;
};

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

export function generateJti(): string {
  return crypto.randomUUID();
}

export async function createAptToken(apartmentId: string): Promise<string> {
  return new SignJWT({ apartmentId, type: 'apartment' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${APT_SESSION_DAYS}d`)
    .setJti(generateJti())
    .sign(getJwtSecret());
}

export async function createMemberToken(payload: {
  apartmentId: string;
  memberId: string;
  isAdmin: boolean;
  isBillManager: boolean;
}): Promise<{ token: string; jti: string }> {
  const jti = generateJti();
  const token = await new SignJWT({
    ...payload,
    type: 'member',
    jti,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MEMBER_SESSION_DAYS}d`)
    .setJti(jti)
    .sign(getJwtSecret());

  await prisma.memberSession.create({
    data: {
      memberId: payload.memberId,
      tokenJti: jti,
      expiresAt: new Date(Date.now() + MEMBER_SESSION_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  return { token, jti };
}

async function verifyToken<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as T;
  } catch {
    return null;
  }
}

export async function getAptSession(): Promise<AptSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(APT_SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken<AptSession & { type: string }>(token);
  if (!payload || payload.type !== 'apartment') return null;
  return { apartmentId: payload.apartmentId, type: 'apartment' };
}

export async function getMemberSession(): Promise<MemberSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(MEMBER_SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken<MemberSession & { type: string }>(token);
  if (!payload || payload.type !== 'member') return null;

  const session = await prisma.memberSession.findUnique({
    where: { tokenJti: payload.jti },
  });
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;

  return {
    apartmentId: payload.apartmentId,
    memberId: payload.memberId,
    jti: payload.jti,
    type: 'member',
    isAdmin: payload.isAdmin,
    isBillManager: payload.isBillManager,
  };
}

export async function revokeMemberSession(jti: string): Promise<void> {
  await prisma.memberSession.updateMany({
    where: { tokenJti: jti, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function setAptCookie(response: NextResponse, token: string): void {
  response.cookies.set(APT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: APT_SESSION_DAYS * 24 * 60 * 60,
    path: '/',
  });
}

export function setMemberCookie(response: NextResponse, token: string): void {
  response.cookies.set(MEMBER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: MEMBER_SESSION_DAYS * 24 * 60 * 60,
    path: '/',
  });
}

export function clearAptCookie(response: NextResponse): void {
  response.cookies.delete(APT_SESSION_COOKIE);
}

export function clearMemberCookie(response: NextResponse): void {
  response.cookies.delete(MEMBER_SESSION_COOKIE);
}

export async function getAptSessionFromRequest(req: NextRequest): Promise<AptSession | null> {
  const token = req.cookies.get(APT_SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken<AptSession & { type: string }>(token);
  if (!payload || payload.type !== 'apartment') return null;
  return { apartmentId: payload.apartmentId, type: 'apartment' };
}

export async function getMemberSessionFromRequest(req: NextRequest): Promise<MemberSession | null> {
  const token = req.cookies.get(MEMBER_SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken<MemberSession & { type: string }>(token);
  if (!payload || payload.type !== 'member') return null;

  const session = await prisma.memberSession.findUnique({
    where: { tokenJti: payload.jti },
  });
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;

  return {
    apartmentId: payload.apartmentId,
    memberId: payload.memberId,
    jti: payload.jti,
    type: 'member',
    isAdmin: payload.isAdmin,
    isBillManager: payload.isBillManager,
  };
}

export async function getMemberRoles(apartmentId: string, memberId: string) {
  const apt = await prisma.apartment.findUnique({
    where: { id: apartmentId },
    select: { adminMemberId: true, billManagerId: true },
  });
  return {
    isAdmin: apt?.adminMemberId === memberId,
    isBillManager: apt?.billManagerId === memberId,
  };
}
