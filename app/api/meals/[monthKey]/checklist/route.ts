import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWeeksInMonth, isMealSlotOptedIn } from '@/lib/calculations/meals';
import { loadMealSlotOptInMatrix } from '@/lib/meal-member-slots';
import {
  requireAptSession,
  requireMemberSession,
  requirePermission,
  jsonOk,
  jsonError,
  handleApiError,
} from '@/lib/api-helpers';

type Params = { params: Promise<{ monthKey: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { monthKey } = await params;
    const apt = await requireAptSession(req);
    const weekIndex = Number(req.nextUrl.searchParams.get('week') || 0);

    const mealConfig = await prisma.mealConfig.findUnique({
      where: { apartmentId: apt.apartmentId },
    });
    const weekStartDay = mealConfig?.weekStartDay ?? 6;
    const mealsPerDay = mealConfig?.mealsPerDay ?? 2;
    const weeks = getWeeksInMonth(monthKey, weekStartDay);
    const weekDates = weeks[weekIndex] || weeks[0] || [];

    if (!weekDates.length) {
      return jsonOk({
        weekDates: [],
        records: [],
        slotOptInMatrix: {},
      });
    }

    const [records, slotOptInMatrix] = await Promise.all([
      prisma.mealRecord.findMany({
        where: {
          apartmentId: apt.apartmentId,
          mealDate: {
            gte: weekDates[0],
            lte: weekDates[weekDates.length - 1],
          },
        },
      }),
      loadMealSlotOptInMatrix(apt.apartmentId, mealsPerDay),
    ]);

    return jsonOk({
      weekIndex,
      weekDates: weekDates.map((d) => d.toISOString().slice(0, 10)),
      totalWeeks: weeks.length,
      records,
      mealConfig,
      slotOptInMatrix,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

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

    const { memberId, mealDate, mealSlot, isConfirmed } = await req.json();
    const date = new Date(mealDate);

    const mealConfig = await prisma.mealConfig.findUnique({
      where: { apartmentId: apt.apartmentId },
    });
    const mealsPerDay = mealConfig?.mealsPerDay ?? 2;
    if (mealSlot < 0 || mealSlot >= mealsPerDay) {
      return jsonError('Invalid meal slot', 400);
    }

    const slotOptInMatrix = await loadMealSlotOptInMatrix(apt.apartmentId, mealsPerDay);
    if (!isMealSlotOptedIn(slotOptInMatrix, memberId, mealSlot)) {
      return jsonError('Member is not enrolled in this meal type', 400);
    }

    const record = await prisma.mealRecord.upsert({
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
        isConfirmed,
        confirmedBy: member.memberId,
        confirmedAt: isConfirmed ? new Date() : null,
      },
      update: {
        isConfirmed,
        confirmedBy: member.memberId,
        confirmedAt: isConfirmed ? new Date() : null,
      },
    });

    return jsonOk(record);
  } catch (err) {
    return handleApiError(err);
  }
}
