import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { createMemberToken, setMemberCookie } from '@/lib/auth';
import { memberLoginSchema } from '@/lib/validation';
import { checkRateLimit, recordFailedAttempt, clearAttempts } from '@/lib/rate-limit';
import { requireAptSession, jsonOk, jsonError, handleApiError } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  try {
    const aptSession = await requireAptSession(req);
    const body = await req.json();
    const parsed = memberLoginSchema.safeParse(body);
    if (!parsed.success) return jsonError('Invalid credentials', 401);

    const { memberId, password } = parsed.data;
    const rateKey = `member:${memberId}`;
    const rate = await checkRateLimit(rateKey, 5, 5 * 60 * 1000, 10 * 60 * 1000);
    if (!rate.allowed) {
      return jsonError(`Account locked. Try again in ${rate.retryAfter}s`, 429);
    }

    const member = await prisma.member.findFirst({
      where: { id: memberId, apartmentId: aptSession.apartmentId, isActive: true },
    });
    if (!member || !(await verifyPassword(password, member.passwordHash))) {
      const fail = await recordFailedAttempt(rateKey, 5, 10 * 60 * 1000);
      if (fail.locked) {
        return jsonError(`Account locked. Try again in ${fail.retryAfter}s`, 429);
      }
      return jsonError('Invalid credentials', 401);
    }

    const apartment = await prisma.apartment.findUnique({
      where: { id: aptSession.apartmentId },
    });

    await clearAttempts(rateKey);
    const { token } = await createMemberToken({
      apartmentId: aptSession.apartmentId,
      memberId: member.id,
      isAdmin: apartment?.adminMemberId === member.id,
      isBillManager: apartment?.billManagerId === member.id,
    });

    const response = jsonOk({
      member: {
        id: member.id,
        name: member.name,
        photoUrl: member.photoUrl,
        isAdmin: apartment?.adminMemberId === member.id,
        isBillManager: apartment?.billManagerId === member.id,
      },
    });
    setMemberCookie(response, token);
    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
