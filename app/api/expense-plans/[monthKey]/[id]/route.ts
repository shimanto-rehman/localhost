import { NextRequest } from 'next/server';
import { expensePlanItemPatchSchema, zodFieldErrors } from '@/lib/validation';
import {
  requireAptSession,
  requireMemberSession,
  requirePermission,
  jsonOk,
  jsonError,
  handleApiError,
} from '@/lib/api-helpers';
import { updateExpensePlanItem, deleteExpensePlanItem } from '@/lib/expense-plan';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ monthKey: string; id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    await requirePermission(member, 'edit_any_expense');

    // Verify the item belongs to this apartment
    const item = await prisma.expensePlanItem.findUnique({
      where: { id },
      select: { id: true, plan: { select: { apartmentId: true } } },
    });
    if (!item || item.plan.apartmentId !== apt.apartmentId) {
      return jsonError('Item not found', 404);
    }

    const body = await req.json();
    const parsed = expensePlanItemPatchSchema.safeParse(body);
    if (!parsed.success) return jsonError('Validation failed', 400, zodFieldErrors(parsed.error));

    const updated = await updateExpensePlanItem(id, parsed.data);
    return jsonOk(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    await requirePermission(member, 'edit_any_expense');

    // Verify the item belongs to this apartment
    const item = await prisma.expensePlanItem.findUnique({
      where: { id },
      select: { id: true, plan: { select: { apartmentId: true } } },
    });
    if (!item || item.plan.apartmentId !== apt.apartmentId) {
      return jsonError('Item not found', 404);
    }

    await deleteExpensePlanItem(id);
    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
