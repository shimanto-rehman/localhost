import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';
import { paymentMethodSchema, zodFieldErrors } from '@/lib/validation';
import {
  requireAptSession,
  requireMemberSession,
  requirePermission,
  jsonOk,
  jsonError,
  handleApiError,
} from '@/lib/api-helpers';

type Params = { params: Promise<{ id: string; pmId: string }> };

function serializeMethod(m: {
  id: string;
  type: string;
  accountNumber: string;
  bankName: string | null;
  branchName: string | null;
  routingNumber: string | null;
  walletType: string | null;
  sortOrder: number;
}) {
  return {
    id: m.id,
    type: m.type,
    accountNumber: decrypt(m.accountNumber),
    bankName: m.bankName,
    branchName: m.branchName,
    routingNumber: m.routingNumber,
    walletType: m.walletType,
    sortOrder: m.sortOrder,
  };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id, pmId } = await params;
    const apt = await requireAptSession(req);
    const memberSession = await requireMemberSession(req);
    await requirePermission(memberSession, 'manage_payment_methods');

    const body = await req.json();
    const parsed = paymentMethodSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Validation failed', 400, zodFieldErrors(parsed.error));
    }
    const d = parsed.data;

    const existing = await prisma.memberPaymentMethod.findFirst({
      where: { id: pmId, memberId: id, apartmentId: apt.apartmentId },
    });
    if (!existing) return jsonError('Payment method not found', 404);
    if (existing.type !== d.type) {
      return jsonError('Cannot change payment method type — delete and add anew', 400);
    }

    const updated = await prisma.memberPaymentMethod.update({
      where: { id: pmId },
      data:
        d.type === 'bank'
          ? {
              accountNumber: encrypt(d.accountNumber),
              bankName: d.bankName,
              branchName: d.branchName,
              routingNumber: d.routingNumber || null,
              walletType: null,
            }
          : {
              accountNumber: encrypt(d.accountNumber),
              walletType: d.walletType,
              bankName: null,
              branchName: null,
              routingNumber: null,
            },
    });

    return jsonOk({ method: serializeMethod(updated) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id, pmId } = await params;
    const apt = await requireAptSession(req);
    const memberSession = await requireMemberSession(req);
    await requirePermission(memberSession, 'manage_payment_methods');

    const deleted = await prisma.memberPaymentMethod.deleteMany({
      where: { id: pmId, memberId: id, apartmentId: apt.apartmentId },
    });
    if (!deleted.count) return jsonError('Payment method not found', 404);

    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
