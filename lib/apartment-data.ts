import { prisma } from './prisma';
import { decrypt } from './encryption';
import { DEFAULT_FIXED_COSTS, DEFAULT_OPTIONAL_COSTS } from './constants';
import type { FixedCostItem, OptionalCostItem, OptInMatrix, RentSplitItem } from './calculations/bills';
import type { MealSlotOptInMatrix } from './calculations/meals';
import { buildMealSlotOptInMatrix, syncMealMemberSlots } from './meal-member-slots';

const DEFAULT_MEAL_NAMES = ['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner'];

export async function seedApartmentDefaults(apartmentId: string, memberIds: string[]) {
  await prisma.fixedCost.createMany({
    data: DEFAULT_FIXED_COSTS.map((c) => ({ ...c, apartmentId })),
  });
  const optionalCosts = await Promise.all(
    DEFAULT_OPTIONAL_COSTS.map((c) =>
      prisma.optionalCost.create({ data: { ...c, apartmentId } })
    )
  );
  for (const oc of optionalCosts) {
    await prisma.optionalCostMember.createMany({
      data: memberIds.map((memberId) => ({
        optionalCostId: oc.id,
        memberId,
        optedIn: true,
      })),
    });
  }
  await prisma.mealConfig.create({
    data: {
      apartmentId,
      mealsPerDay: DEFAULT_MEAL_NAMES.length,
      mealNames: DEFAULT_MEAL_NAMES,
    },
  });
  await syncMealMemberSlots(apartmentId, DEFAULT_MEAL_NAMES.length);
}

export async function getApartmentConfig(apartmentId: string) {
  const [apartment, members, fixedCosts, optionalCosts, rentSplits, mealConfig, mealSlotRows] =
    await Promise.all([
    prisma.apartment.findUnique({ where: { id: apartmentId } }),
    prisma.member.findMany({ where: { apartmentId }, orderBy: { createdAt: 'asc' } }),
    prisma.fixedCost.findMany({ where: { apartmentId, isActive: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.optionalCost.findMany({
      where: { apartmentId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { members: true },
    }),
    prisma.rentSplit.findMany({ where: { apartmentId } }),
    prisma.mealConfig.findUnique({ where: { apartmentId } }),
    prisma.mealMemberSlot.findMany({ where: { apartmentId } }),
  ]);

  if (!apartment) return null;

  const optInMatrix: OptInMatrix = {};
  optionalCosts.forEach((oc) => {
    optInMatrix[oc.id] = {};
    oc.members.forEach((m) => {
      optInMatrix[oc.id][m.memberId] = m.optedIn;
    });
    members.forEach((m) => {
      if (optInMatrix[oc.id][m.id] === undefined) optInMatrix[oc.id][m.id] = true;
    });
  });

  const mealsPerDay = mealConfig?.mealsPerDay ?? 2;
  const mealSlotOptInMatrix: MealSlotOptInMatrix = buildMealSlotOptInMatrix(
    members.filter((m) => m.isActive).map((m) => m.id),
    mealsPerDay,
    mealSlotRows.map((r) => ({
      memberId: r.memberId,
      mealSlot: r.mealSlot,
      optedIn: r.optedIn,
    })),
  );

  return {
    apartment,
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      photoUrl: m.photoUrl,
      email: m.email,
      phone: m.phone,
      hometown: m.hometown,
      country: m.country,
      moveInDate: m.moveInDate?.toISOString().slice(0, 10) || null,
      isActive: m.isActive,
      isAdmin: apartment.adminMemberId === m.id,
      isBillManager: apartment.billManagerId === m.id,
    })),
    fixedCosts: fixedCosts as FixedCostItem[],
    optionalCosts: optionalCosts.map((oc) => ({
      id: oc.id,
      name: oc.name,
      amount: oc.amount,
    })) as OptionalCostItem[],
    optInMatrix,
    rentSplits: rentSplits.map((r) => ({
      memberId: r.memberId,
      fixedAmount: r.fixedAmount,
    })) as RentSplitItem[],
    mealConfig: mealConfig || {
      mealsPerDay: 4,
      mealNames: DEFAULT_MEAL_NAMES,
      weekStartDay: 6,
      rateOverride: null,
    },
    mealSlotOptInMatrix,
  };
}

export async function getBillSnapshotData(apartmentId: string) {
  const config = await getApartmentConfig(apartmentId);
  if (!config) return null;
  return {
    members: config.members,
    fixedCosts: config.fixedCosts,
    optionalCosts: config.optionalCosts,
    optInMatrix: config.optInMatrix,
    rentSplits: config.rentSplits,
  };
}

export function sanitizeMemberForClient(member: {
  id: string;
  name: string;
  photoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  nid?: string | null;
  hometown?: string | null;
  country?: string | null;
  moveInDate?: Date | null;
  isActive: boolean;
  isAdmin?: boolean;
  isBillManager?: boolean;
}, revealNid = false) {
  return {
    id: member.id,
    name: member.name,
    photoUrl: member.photoUrl,
    email: member.email,
    phone: member.phone,
    nid: revealNid && member.nid ? decrypt(member.nid) : member.nid ? '****' : null,
    hometown: member.hometown,
    country: member.country,
    moveInDate: member.moveInDate instanceof Date
      ? member.moveInDate.toISOString().slice(0, 10)
      : member.moveInDate,
    isActive: member.isActive,
    isAdmin: member.isAdmin,
    isBillManager: member.isBillManager,
  };
}
