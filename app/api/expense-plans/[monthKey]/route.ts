import { NextRequest } from 'next/server';
import { isValidMonthKey } from '@/lib/utils';
import { expensePlanItemSchema, zodFieldErrors } from '@/lib/validation';
import {
  requireAptSession,
  requireMemberSession,
  requirePermission,
  jsonOk,
  jsonError,
  handleApiError,
} from '@/lib/api-helpers';
import {
  getExpensePlansWithTotals,
  getExpensePlanNameSuggestions,
  upsertExpensePlan,
  createExpensePlanItem,
} from '@/lib/expense-plan';
import { EXPENSE_CATEGORIES } from '@/lib/constants';

type Params = { params: Promise<{ monthKey: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { monthKey } = await params;
    if (!isValidMonthKey(monthKey)) return jsonError('Invalid month key', 400);

    const apt = await requireAptSession(req);
    const [{ plans, totals, totalItems, totalBudget }, suggestions] = await Promise.all([
      getExpensePlansWithTotals(apt.apartmentId, monthKey),
      getExpensePlanNameSuggestions(apt.apartmentId),
    ]);

    return jsonOk({ plans, totals, totalItems, totalBudget, suggestions });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { monthKey } = await params;
    if (!isValidMonthKey(monthKey)) return jsonError('Invalid month key', 400);

    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    await requirePermission(member, 'edit_any_expense');

    const body = await req.json();
    const parsed = expensePlanItemSchema.safeParse(body);
    if (!parsed.success) return jsonError('Validation failed', 400, zodFieldErrors(parsed.error));
    const d = parsed.data;

    if (!EXPENSE_CATEGORIES.includes(d.category as typeof EXPENSE_CATEGORIES[number])) {
      return jsonError('Invalid category', 400);
    }

    // Upsert the plan for this category
    const plan = await upsertExpensePlan(apt.apartmentId, monthKey, d.category);

    // Create the item
    const item = await createExpensePlanItem(plan.id, {
      itemName: d.itemName,
      unit: d.unit,
      quantity: d.quantity,
      unitPrice: d.unitPrice,
    });

    return jsonOk(item, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
