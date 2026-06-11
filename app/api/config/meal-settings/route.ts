import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAptSession,
  requireMemberSession,
  requireAdmin,
  jsonOk,
  handleApiError,
} from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const config = await prisma.mealConfig.findUnique({
      where: { apartmentId: apt.apartmentId },
    });
    return jsonOk(config || { mealsPerDay: 2, mealNames: ['Lunch', 'Dinner'], weekStartDay: 6 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    requireAdmin(member);

    const body = await req.json();
    const config = await prisma.mealConfig.upsert({
      where: { apartmentId: apt.apartmentId },
      create: {
        apartmentId: apt.apartmentId,
        mealsPerDay: body.mealsPerDay ?? 2,
        mealNames: body.mealNames ?? ['Lunch', 'Dinner'],
        weekStartDay: body.weekStartDay ?? 6,
        rateOverride: body.rateOverride ?? null,
      },
      update: {
        mealsPerDay: body.mealsPerDay,
        mealNames: body.mealNames,
        weekStartDay: body.weekStartDay,
        rateOverride: body.rateOverride,
      },
    });

    return jsonOk(config);
  } catch (err) {
    return handleApiError(err);
  }
}
