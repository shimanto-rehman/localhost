import { NextRequest } from 'next/server';
import { clearAptCookie, clearMemberCookie } from '@/lib/auth';
import { jsonOk } from '@/lib/api-helpers';

export async function POST(_req: NextRequest) {
  const response = jsonOk({ success: true });
  clearAptCookie(response);
  clearMemberCookie(response);
  return response;
}
