import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAptSession,
  requireMemberSession,
  requirePermission,
  jsonOk,
  jsonError,
  handleApiError,
} from '@/lib/api-helpers';
import { guestMealPatchSchema, zodFieldErrors } from '@/lib/validation';

type Params = { params: Promise<{ monthKey: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { monthKey } = await params;
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    await requirePermission(member, 'manage_meal_checklist');

    const mealMonth = await prisma.mealMonth.findUnique({
      where: { apartmentId_monthKey: { apartmentId: apt.apartmentId, monthKey } },
    });
    if (mealMonth?.isFinalized) return jsonError('Meals finalized for this month', 403);

    const body = await req.json();
    const parsed = guestMealPatchSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Validation failed', 400, zodFieldErrors(parsed.error));
    }
    const { memberId, mealDate, mealSlot, guestCount } = parsed.data;
    const date = new Date(mealDate + 'T12:00:00');

    const mealConfig = await prisma.mealConfig.findUnique({
      where: { apartmentId: apt.apartmentId },
    });
    const mealsPerDay = mealConfig?.mealsPerDay ?? 2;
    if (mealSlot < 0 || mealSlot >= mealsPerDay) {
      return jsonError('Invalid meal slot', 400);
    }

    if (guestCount === 0) {
      await prisma.guestMealRecord.deleteMany({
        where: {
          apartmentId: apt.apartmentId,
          memberId,
          mealDate: date,
          mealSlot,
        },
      });
      return jsonOk({ memberId, mealDate, mealSlot, guestCount: 0 });
    }

    const record = await prisma.guestMealRecord.upsert({
      where: {
        apartmentId_memberId_mealDate_mealSlot: {
          apartmentId: apt.apartmentId,
          memberId,
          mealDate: date,
          mealSlot,
        },
      },
      create: {
        apartmentId: apt.apartmentId,
        memberId,
        mealDate: date,
        mealSlot,
        guestCount,
      },
      update: { guestCount },
    });

    return jsonOk(record);
  } catch (err) {
    return handleApiError(err);
  }
}
