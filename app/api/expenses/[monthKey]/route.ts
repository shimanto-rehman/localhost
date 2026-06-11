import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { expenseSchema, zodFieldErrors } from '@/lib/validation';
import { computeExpenseCarryIn, calcExpenseMonth } from '@/lib/calculations/expenses';
import {
  requireAptSession,
  requireMemberSession,
  jsonOk,
  jsonError,
  handleApiError,
} from '@/lib/api-helpers';

type Params = { params: Promise<{ monthKey: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { monthKey } = await params;
    const apt = await requireAptSession(req);

    const [expenses, members] = await Promise.all([
      prisma.expense.findMany({
        where: { apartmentId: apt.apartmentId, monthKey },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.member.findMany({
        where: { apartmentId: apt.apartmentId, isActive: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const mapExpense = (e: typeof expenses[0]) => ({
      id: e.id,
      memberId: e.memberId,
      itemName: e.itemName,
      price: e.price,
      category: e.category,
      expenseDate: e.expenseDate?.toISOString().slice(0, 10) ?? null,
    });

    const allByMonth: Record<string, ReturnType<typeof mapExpense>[]> = {};
    const allExpenses = await prisma.expense.findMany({
      where: { apartmentId: apt.apartmentId },
    });
    allExpenses.forEach((e) => {
      if (!allByMonth[e.monthKey]) allByMonth[e.monthKey] = [];
      allByMonth[e.monthKey].push(mapExpense(e));
    });

    const memberIds = members.map((m) => m.id);
    const carryIn = computeExpenseCarryIn(monthKey, allByMonth, memberIds);
    const calc = calcExpenseMonth(
      monthKey,
      expenses.map(mapExpense),
      members.map((m) => ({ id: m.id, name: m.name, photoUrl: m.photoUrl })),
      carryIn
    );

    return jsonOk({ expenses, calculation: calc, members });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { monthKey } = await params;
    const apt = await requireAptSession(req);
    const memberSession = await requireMemberSession(req);

    const body = await req.json();
    const parsed = expenseSchema.safeParse(body);
    if (!parsed.success) return jsonError('Validation failed', 400, zodFieldErrors(parsed.error));

    const targetMemberId = parsed.data.memberId || memberSession.memberId;
    if (targetMemberId !== memberSession.memberId && !memberSession.isAdmin) {
      return jsonError('Cannot add expense for another member', 403);
    }

    const expense = await prisma.expense.create({
      data: {
        apartmentId: apt.apartmentId,
        memberId: targetMemberId,
        monthKey,
        itemName: parsed.data.itemName,
        price: parsed.data.price,
        category: parsed.data.category,
        expenseDate: parsed.data.expenseDate ? new Date(parsed.data.expenseDate) : null,
      },
    });

    return jsonOk(expense, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
