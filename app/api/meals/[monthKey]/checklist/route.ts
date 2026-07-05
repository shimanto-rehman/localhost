import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWeeksInMonth, isMealSlotOptedIn } from '@/lib/calculations/meals';
import { loadMealSlotOptInMatrix } from '@/lib/meal-member-slots';
import { localDateStr } from '@/lib/meal-planning';
import {
  requireAptSession,
  requireMemberSession,
  requirePermission,
  jsonOk,
  jsonError,
  handleApiError,
} from '@/lib/api-helpers';

type Params = { params: Promise<{ monthKey: string }> };

const recordSelect = {
  memberId: true,
  mealDate: true,
  mealSlot: true,
  isConfirmed: true,
  planStatus: true,
} as const;

const guestSelect = {
  memberId: true,
  mealDate: true,
  mealSlot: true,
  guestCount: true,
} as const;

function dateToDayStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function serializeRecord<T extends { mealDate: Date }>(
  row: T,
): Omit<T, 'mealDate'> & { mealDate: string } {
  return {
    ...row,
    mealDate: dateToDayStr(row.mealDate),
  };
}

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
        guestRecords: [],
        slotOptInMatrix: {},
      });
    }

    const range = {
      gte: weekDates[0],
      lte: weekDates[weekDates.length - 1],
    };

    const [records, guestRecords, slotOptInMatrix] = await Promise.all([
      prisma.mealRecord.findMany({
        where: { apartmentId: apt.apartmentId, mealDate: range },
        select: recordSelect,
      }),
      prisma.guestMealRecord.findMany({
        where: { apartmentId: apt.apartmentId, mealDate: range },
        select: guestSelect,
      }),
      loadMealSlotOptInMatrix(apt.apartmentId, mealsPerDay),
    ]);

    return jsonOk({
      weekIndex,
      weekDates: weekDates.map(dateToDayStr),
      totalWeeks: weeks.length,
      records: records.map(serializeRecord),
      guestRecords: guestRecords.map(serializeRecord),
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
      select: { isFinalized: true },
    });
    if (mealMonth?.isFinalized) return jsonError('Meals finalized for this month', 403);

    const body = await req.json();
    const { memberId, mealDate, mealSlot, isConfirmed, planStatus } = body as {
      memberId: string;
      mealDate: string;
      mealSlot: number;
      isConfirmed?: boolean;
      planStatus?: 'PLANNED' | 'OPT_OUT' | null;
    };

    const date = new Date(mealDate + 'T12:00:00');
    const today = localDateStr();
    const isFuture = mealDate > today;

    const mealConfig = await prisma.mealConfig.findUnique({
      where: { apartmentId: apt.apartmentId },
      select: { mealsPerDay: true },
    });
    const mealsPerDay = mealConfig?.mealsPerDay ?? 2;
    if (mealSlot < 0 || mealSlot >= mealsPerDay) {
      return jsonError('Invalid meal slot', 400);
    }

    const slotOptInMatrix = await loadMealSlotOptInMatrix(apt.apartmentId, mealsPerDay);
    if (!isMealSlotOptedIn(slotOptInMatrix, memberId, mealSlot)) {
      return jsonError('Member is not enrolled in this meal type', 400);
    }

    const uniqueWhere = {
      apartmentId_memberId_mealDate_mealSlot: {
        apartmentId: apt.apartmentId,
        memberId,
        mealDate: date,
        mealSlot,
      },
    };

    // Future dates: tri-state planning cycle only
    if (planStatus !== undefined) {
      if (!isFuture) {
        return jsonError('Meal planning is only available for future dates', 400);
      }

      if (planStatus === null) {
        await prisma.mealRecord.deleteMany({
          where: {
            apartmentId: apt.apartmentId,
            memberId,
            mealDate: date,
            mealSlot,
          },
        });
        return jsonOk({ memberId, mealDate, mealSlot, planStatus: null, isConfirmed: false });
      }

      if (planStatus !== 'PLANNED' && planStatus !== 'OPT_OUT') {
        return jsonError('Invalid plan status', 400);
      }

      const record = await prisma.mealRecord.upsert({
        where: uniqueWhere,
        create: {
          apartmentId: apt.apartmentId,
          memberId,
          mealDate: date,
          mealSlot,
          isConfirmed: false,
          planStatus,
          confirmedBy: null,
          confirmedAt: null,
        },
        update: {
          isConfirmed: false,
          planStatus,
          confirmedBy: null,
          confirmedAt: null,
        },
        select: recordSelect,
      });

      return jsonOk(serializeRecord(record));
    }

    // Today / past: confirm or withdraw attendance
    if (isFuture) {
      return jsonError('Use planStatus to plan future meals', 400);
    }
    if (isConfirmed === undefined) {
      return jsonError('isConfirmed or planStatus required', 400);
    }

    const record = await prisma.mealRecord.upsert({
      where: uniqueWhere,
      create: {
        apartmentId: apt.apartmentId,
        memberId,
        mealDate: date,
        mealSlot,
        isConfirmed,
        planStatus: null,
        confirmedBy: member.memberId,
        confirmedAt: isConfirmed ? new Date() : null,
      },
      update: {
        isConfirmed,
        planStatus: null,
        confirmedBy: member.memberId,
        confirmedAt: isConfirmed ? new Date() : null,
      },
      select: recordSelect,
    });

    return jsonOk(serializeRecord(record));
  } catch (err) {
    return handleApiError(err);
  }
}
