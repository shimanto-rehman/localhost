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
import { mealSettingsSchema, zodFieldErrors } from '@/lib/validation';
import { syncMealMemberSlots } from '@/lib/meal-member-slots';

export async function GET(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const config = await prisma.mealConfig.findUnique({
      where: { apartmentId: apt.apartmentId },
    });
    return jsonOk(
      config || {
        mealsPerDay: 4,
        mealNames: ['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner'],
        weekStartDay: 6,
        rateOverride: null,
      },
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    await requirePermission(member, 'manage_meal_settings');

    const body = await req.json();
    const parsed = mealSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Validation failed', 400, zodFieldErrors(parsed.error));
    }
    const d = parsed.data;

    const config = await prisma.mealConfig.upsert({
      where: { apartmentId: apt.apartmentId },
      create: {
        apartmentId: apt.apartmentId,
        mealsPerDay: d.mealsPerDay,
        mealNames: d.mealNames,
        weekStartDay: d.weekStartDay,
        rateOverride: d.rateOverride ?? null,
      },
      update: {
        mealsPerDay: d.mealsPerDay,
        mealNames: d.mealNames,
        weekStartDay: d.weekStartDay,
        rateOverride: d.rateOverride ?? null,
      },
    });

    await syncMealMemberSlots(apt.apartmentId, d.mealsPerDay);

    return jsonOk(config);
  } catch (err) {
    return handleApiError(err);
  }
}
