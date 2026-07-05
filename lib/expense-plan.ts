import { prisma } from './prisma';

export async function getExpensePlans(apartmentId: string, monthKey: string) {
  return prisma.expensePlan.findMany({
    where: { apartmentId, monthKey },
    include: {
      items: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          itemName: true,
          unit: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          sortOrder: true,
        },
      },
    },
  });
}

export async function getExpensePlansWithTotals(apartmentId: string, monthKey: string) {
  const plans = await getExpensePlans(apartmentId, monthKey);

  const totals: Record<string, number> = {};
  let totalItems = 0;
  let totalBudget = 0;

  for (const plan of plans) {
    const categoryTotal = plan.items.reduce((sum, item) => sum + item.totalPrice, 0);
    totals[plan.category] = categoryTotal;
    totalItems += plan.items.length;
    totalBudget += categoryTotal;
  }

  return { plans, totals, totalItems, totalBudget };
}

export async function upsertExpensePlan(
  apartmentId: string,
  monthKey: string,
  category: string,
) {
  return prisma.expensePlan.upsert({
    where: {
      apartmentId_monthKey_category: { apartmentId, monthKey, category },
    },
    create: { apartmentId, monthKey, category },
    update: {},
  });
}

export async function createExpensePlanItem(
  planId: string,
  data: {
    itemName: string;
    unit: string;
    quantity: number;
    unitPrice: number;
  },
) {
  const totalPrice = data.quantity * data.unitPrice;

  // Get max sortOrder for this plan
  const lastItem = await prisma.expensePlanItem.findFirst({
    where: { planId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });
  const sortOrder = (lastItem?.sortOrder ?? -1) + 1;

  return prisma.expensePlanItem.create({
    data: {
      planId,
      itemName: data.itemName,
      unit: data.unit,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      totalPrice,
      sortOrder,
    },
  });
}

export async function updateExpensePlanItem(
  id: string,
  data: {
    itemName?: string;
    unit?: string;
    quantity?: number;
    unitPrice?: number;
  },
) {
  // Get current item to calculate new total
  const current = await prisma.expensePlanItem.findUnique({
    where: { id },
    select: { quantity: true, unitPrice: true },
  });
  if (!current) throw new Error('Item not found');

  const quantity = data.quantity ?? current.quantity;
  const unitPrice = data.unitPrice ?? current.unitPrice;
  const totalPrice = quantity * unitPrice;

  return prisma.expensePlanItem.update({
    where: { id },
    data: {
      ...data,
      totalPrice,
    },
  });
}

export async function deleteExpensePlanItem(id: string) {
  return prisma.expensePlanItem.delete({ where: { id } });
}

/** Distinct item names per category from all months (for autocomplete). */
export async function getExpensePlanNameSuggestions(apartmentId: string) {
  const rows = await prisma.expensePlanItem.findMany({
    where: { plan: { apartmentId } },
    select: { itemName: true, plan: { select: { category: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  const byCategory: Record<string, string[]> = {};
  const seen = new Set<string>();

  for (const row of rows) {
    const cat = row.plan.category;
    const key = `${cat}\0${row.itemName.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(row.itemName);
  }

  for (const cat of Object.keys(byCategory)) {
    byCategory[cat].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }

  return byCategory;
}
