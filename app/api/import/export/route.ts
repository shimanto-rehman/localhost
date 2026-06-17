import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAptSession,
  requireMemberSession,
  handleApiError,
  jsonError,
} from '@/lib/api-helpers';
import {
  XLSX_MIME,
  loadWorkbook,
  workbookToBuffer,
  fillDashboardMeta,
  fillRoster,
  fillMealSlotLabels,
  fillMealsGrid,
  fillMarket,
  fillFixedCosts,
  fillBill,
  fillExpenses,
  ROSTER,
  slugify,
  type RosterMember,
} from '@/lib/excel-template';

const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function monthRange(monthKey: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  // Use UTC to match how meal_date / expense_date are stored as `@db.Date`.
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));
  return { start, end };
}

export async function GET(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);

    const monthKey = req.nextUrl.searchParams.get('monthKey') || '';
    if (!monthKey || !MONTH_KEY_RE.test(monthKey)) {
      return jsonError('Invalid monthKey. Expected YYYY-MM.', 400);
    }

    const { start, end } = monthRange(monthKey);
    const apartmentId = apt.apartmentId;

    const [
      apartment,
      members,
      currentMember,
      mealConfig,
      mealRecords,
      mealShopping,
      fixedCosts,
      monthlyBill,
      expenses,
    ] = await Promise.all([
      prisma.apartment.findUnique({
        where: { id: apartmentId },
        select: {
          name: true,
          registrationId: true,
          adminMemberId: true,
          billManagerId: true,
        },
      }),
      prisma.member.findMany({
        where: { apartmentId, isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, email: true, phone: true },
        take: ROSTER.lastRow - ROSTER.firstRow + 1,
      }),
      prisma.member.findUnique({
        where: { id: member.memberId },
        select: { name: true, email: true, phone: true },
      }),
      prisma.mealConfig.findUnique({
        where: { apartmentId },
        select: { mealNames: true },
      }),
      prisma.mealRecord.findMany({
        where: { apartmentId, mealDate: { gte: start, lt: end } },
        select: { memberId: true, mealDate: true, mealSlot: true },
      }),
      prisma.mealShopping.findMany({
        where: { apartmentId, monthKey },
        orderBy: { purchaseDate: 'asc' },
        select: {
          itemName: true,
          amount: true,
          purchaseDate: true,
          memberId: true,
        },
      }),
      prisma.fixedCost.findMany({
        where: { apartmentId, isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { name: true, amount: true },
      }),
      prisma.monthlyBill.findUnique({
        where: { apartmentId_monthKey: { apartmentId, monthKey } },
        select: {
          electricity: true,
          adjustments: {
            select: {
              memberId: true,
              type: true,
              label: true,
              amount: true,
              createdBy: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      prisma.expense.findMany({
        where: { apartmentId, monthKey },
        orderBy: { expenseDate: 'asc' },
        select: {
          itemName: true,
          price: true,
          category: true,
          expenseDate: true,
          memberId: true,
        },
      }),
    ]);

    // Detect months with no data at all and tell the client rather than
    // returning an empty workbook.
    const hasData =
      mealRecords.length > 0 ||
      mealShopping.length > 0 ||
      expenses.length > 0 ||
      monthlyBill !== null;

    if (!hasData) {
      return Response.json(
        { noData: true, monthKey, message: `No data found for ${monthKey}` },
        { status: 404 },
      );
    }

    const memberById = new Map<string, RosterMember>();
    for (const m of members) memberById.set(m.id, m);

    const wb = await loadWorkbook();
    fillDashboardMeta(wb, {
      apartment,
      monthKey,
      preparedBy: currentMember,
      submissionDate: new Date(),
    });
    fillRoster(wb, { members, apartment });
    if (mealConfig?.mealNames?.length) fillMealSlotLabels(wb, mealConfig.mealNames);
    fillMealsGrid(wb, { members, monthKey, records: mealRecords });
    fillMarket(wb, { rows: mealShopping, memberById });
    fillFixedCosts(wb, { rows: fixedCosts });
    fillBill(wb, {
      bill: monthlyBill,
      adjustments: monthlyBill?.adjustments ?? [],
      memberById,
    });
    fillExpenses(wb, { rows: expenses, memberById });

    const out = await workbookToBuffer(wb);

    const filename = `LocalHost_${slugify(apartment?.name || 'apartment', 'apartment')}_${monthKey}_export.xlsx`;

    return new Response(new Uint8Array(out), {
      headers: {
        'Content-Type': XLSX_MIME,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(out.length),
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
