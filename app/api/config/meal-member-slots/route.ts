import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAptSession,
  requireMemberSession,
  requirePermission,
  memberCan,
  jsonOk,
  jsonError,
  handleApiError,
  ApiError,
} from '@/lib/api-helpers';
import { mealMemberSlotsPatchSchema, zodFieldErrors } from '@/lib/validation';
import {
  clearConfirmedMealRecords,
  loadMealSlotOptInMatrix,
} from '@/lib/meal-member-slots';

export async function GET(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const mealConfig = await prisma.mealConfig.findUnique({
      where: { apartmentId: apt.apartmentId },
    });
    const mealsPerDay = mealConfig?.mealsPerDay ?? 2;
    const mealNames = mealConfig?.mealNames ?? ['Lunch', 'Dinner'];
    const matrix = await loadMealSlotOptInMatrix(apt.apartmentId, mealsPerDay);

    return jsonOk({
      mealsPerDay,
      mealNames,
      slotOptInMatrix: matrix,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const session = await requireMemberSession(req);

    const body = await req.json();
    const parsed = mealMemberSlotsPatchSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Validation failed', 400, zodFieldErrors(parsed.error));
    }
    const { memberId, slots } = parsed.data;

    const isSelf = memberId === session.memberId;
    if (isSelf) {
      const can = await memberCan(session, 'manage_own_meal_plan');
      if (!can) throw new ApiError('You do not have permission for this action', 403);
    } else {
      await requirePermission(session, 'manage_member_meal_plans');
    }

    const member = await prisma.member.findFirst({
      where: { id: memberId, apartmentId: apt.apartmentId, isActive: true },
    });
    if (!member) return jsonError('Member not found', 404);

    const mealConfig = await prisma.mealConfig.findUnique({
      where: { apartmentId: apt.apartmentId },
    });
    const mealsPerDay = mealConfig?.mealsPerDay ?? 2;

    const updates = Object.entries(slots).map(([slotKey, optedIn]) => {
      const mealSlot = Number(slotKey);
      if (!Number.isInteger(mealSlot) || mealSlot < 0 || mealSlot >= mealsPerDay) {
        throw new ApiError(`Invalid meal slot: ${slotKey}`, 400);
      }
      return { mealSlot, optedIn };
    });

    await Promise.all(
      updates.map(async ({ mealSlot, optedIn }) => {
        await prisma.mealMemberSlot.upsert({
          where: {
            apartmentId_memberId_mealSlot: {
              apartmentId: apt.apartmentId,
              memberId,
              mealSlot,
            },
          },
          create: {
            apartmentId: apt.apartmentId,
            memberId,
            mealSlot,
            optedIn,
          },
          update: { optedIn },
        });
        if (!optedIn) {
          await clearConfirmedMealRecords(apt.apartmentId, memberId, mealSlot);
        }
      }),
    );

    const matrix = await loadMealSlotOptInMatrix(apt.apartmentId, mealsPerDay);
    return jsonOk({ slotOptInMatrix: matrix });
  } catch (err) {
    return handleApiError(err);
  }
}
