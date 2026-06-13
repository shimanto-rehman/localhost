import { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { adjustmentSchema, zodFieldErrors } from '@/lib/validation';
import { billCalcCacheTag } from '@/lib/bill-calculation';
import {
  requireAptSession,
  requireMemberSession,
  requirePermission,
  jsonOk,
  jsonError,
  handleApiError,
} from '@/lib/api-helpers';

type Params = { params: Promise<{ monthKey: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { monthKey } = await params;
    const apt = await requireAptSession(req);
    const bill = await prisma.monthlyBill.findUnique({
      where: { apartmentId_monthKey: { apartmentId: apt.apartmentId, monthKey } },
      include: { adjustments: true },
    });
    return jsonOk(bill?.adjustments || []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { monthKey } = await params;
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    await requirePermission(member, 'bill_adjustments');

    const bill = await prisma.monthlyBill.findUnique({
      where: { apartmentId_monthKey: { apartmentId: apt.apartmentId, monthKey } },
    });
    if (!bill?.isLocked) return jsonError('Adjustments only allowed on locked months', 400);

    const body = await req.json();
    const parsed = adjustmentSchema.safeParse(body);
    if (!parsed.success) return jsonError('Validation failed', 400, zodFieldErrors(parsed.error));

    const adjustment = await prisma.billAdjustment.create({
      data: {
        billId: bill.id,
        memberId: parsed.data.memberId,
        type: parsed.data.type,
        label: parsed.data.label,
        amount: parsed.data.amount,
        createdBy: member.memberId,
      },
    });

    revalidateTag(billCalcCacheTag(apt.apartmentId, monthKey));

    return jsonOk(adjustment, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
