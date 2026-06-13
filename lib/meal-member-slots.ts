import { prisma } from './prisma';

export type MealSlotOptInMatrix = Record<string, Record<number, boolean>>;

export function buildMealSlotOptInMatrix(
  memberIds: string[],
  mealsPerDay: number,
  rows: { memberId: string; mealSlot: number; optedIn: boolean }[],
): MealSlotOptInMatrix {
  const matrix: MealSlotOptInMatrix = {};
  memberIds.forEach((memberId) => {
    matrix[memberId] = {};
    for (let slot = 0; slot < mealsPerDay; slot++) {
      matrix[memberId][slot] = true;
    }
  });
  rows.forEach((row) => {
    if (!matrix[row.memberId]) matrix[row.memberId] = {};
    if (row.mealSlot >= 0 && row.mealSlot < mealsPerDay) {
      matrix[row.memberId][row.mealSlot] = row.optedIn;
    }
  });
  return matrix;
}

export async function loadMealSlotOptInMatrix(apartmentId: string, mealsPerDay: number) {
  const [members, rows] = await Promise.all([
    prisma.member.findMany({
      where: { apartmentId, isActive: true },
      select: { id: true },
    }),
    prisma.mealMemberSlot.findMany({
      where: { apartmentId },
    }),
  ]);
  return buildMealSlotOptInMatrix(
    members.map((m) => m.id),
    mealsPerDay,
    rows.map((r) => ({
      memberId: r.memberId,
      mealSlot: r.mealSlot,
      optedIn: r.optedIn,
    })),
  );
}

/** Ensure every active member has slot rows for 0..mealsPerDay-1; remove extras. */
export async function syncMealMemberSlots(apartmentId: string, mealsPerDay: number) {
  const members = await prisma.member.findMany({
    where: { apartmentId, isActive: true },
    select: { id: true },
  });

  await prisma.mealMemberSlot.deleteMany({
    where: {
      apartmentId,
      mealSlot: { gte: mealsPerDay },
    },
  });

  const upserts = members.flatMap((member) =>
    Array.from({ length: mealsPerDay }, (_, slot) =>
      prisma.mealMemberSlot.upsert({
        where: {
          apartmentId_memberId_mealSlot: {
            apartmentId,
            memberId: member.id,
            mealSlot: slot,
          },
        },
        create: {
          apartmentId,
          memberId: member.id,
          mealSlot: slot,
          optedIn: true,
        },
        update: {},
      }),
    ),
  );

  await Promise.all(upserts);
}

export async function seedMealMemberSlotsForMember(apartmentId: string, memberId: string) {
  const mealConfig = await prisma.mealConfig.findUnique({ where: { apartmentId } });
  const mealsPerDay = mealConfig?.mealsPerDay ?? 2;
  await Promise.all(
    Array.from({ length: mealsPerDay }, (_, slot) =>
      prisma.mealMemberSlot.upsert({
        where: {
          apartmentId_memberId_mealSlot: {
            apartmentId,
            memberId,
            mealSlot: slot,
          },
        },
        create: {
          apartmentId,
          memberId,
          mealSlot: slot,
          optedIn: true,
        },
        update: {},
      }),
    ),
  );
}

export async function clearConfirmedMealRecords(
  apartmentId: string,
  memberId: string,
  mealSlot: number,
) {
  await prisma.mealRecord.updateMany({
    where: {
      apartmentId,
      memberId,
      mealSlot,
      isConfirmed: true,
    },
    data: {
      isConfirmed: false,
      confirmedBy: null,
      confirmedAt: null,
    },
  });
}
