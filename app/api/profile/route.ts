import { NextRequest } from 'next/server';
import { getMemberSessionFromRequest } from '@/lib/auth';
import { getMemberProfile } from '@/lib/member-profile';
import { requireAptSession, jsonOk, jsonError, handleApiError } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const memberSession = await getMemberSessionFromRequest(req);
    if (!memberSession) {
      return jsonError('Sign in to view your profile', 401);
    }

    const year = Number(req.nextUrl.searchParams.get('year') || new Date().getFullYear());
    const profile = await getMemberProfile(
      apt.apartmentId,
      memberSession.memberId,
      year,
    );

    if (!profile) return jsonError('Profile not found', 404);
    return jsonOk(profile);
  } catch (err) {
    return handleApiError(err);
  }
}
