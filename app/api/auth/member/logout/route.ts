import { NextRequest } from 'next/server';
import { getMemberSessionFromRequest, revokeMemberSession, clearMemberCookie } from '@/lib/auth';
import { jsonOk } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  const member = await getMemberSessionFromRequest(req);
  if (member) await revokeMemberSession(member.jti);
  const response = jsonOk({ success: true });
  clearMemberCookie(response);
  return response;
}
