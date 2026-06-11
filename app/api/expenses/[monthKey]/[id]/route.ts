import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { expenseSchema, zodFieldErrors } from '@/lib/validation';
import {
  requireAptSession,
  requireMemberSession,
  jsonOk,
  jsonError,
  handleApiError,
} from '@/lib/api-helpers';

type Params = { params: Promise<{ monthKey: string; id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const apt = await requireAptSession(req);
    const memberSession = await requireMemberSession(req);

    const existing = await prisma.expense.findFirst({
      where: { id, apartmentId: apt.apartmentId },
    });
    if (!existing) return jsonError('Not found', 404);

    if (existing.memberId !== memberSession.memberId && !memberSession.isAdmin) {
      return jsonError('Not allowed', 403);
    }

    const body = await req.json();
    const parsed = expenseSchema.partial().safeParse(body);
    if (!parsed.success) return jsonError('Validation failed', 400, zodFieldErrors(parsed.error));

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        itemName: parsed.data.itemName,
        price: parsed.data.price,
        category: parsed.data.category,
        expenseDate: parsed.data.expenseDate ? new Date(parsed.data.expenseDate) : undefined,
      },
    });

    return jsonOk(expense);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const apt = await requireAptSession(req);
    const memberSession = await requireMemberSession(req);

    const existing = await prisma.expense.findFirst({
      where: { id, apartmentId: apt.apartmentId },
    });
    if (!existing) return jsonOk({ success: true });

    if (existing.memberId !== memberSession.memberId && !memberSession.isAdmin) {
      return jsonError('Not allowed', 403);
    }

    await prisma.expense.delete({ where: { id } });
    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
