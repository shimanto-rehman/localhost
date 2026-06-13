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

type Params = { params: Promise<{ id: string }> };

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

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const apt = await requireAptSession(req);

    const member = await prisma.member.findFirst({
      where: { id, apartmentId: apt.apartmentId },
    });
    if (!member) return jsonError('Member not found', 404);

    const methods = await prisma.memberPaymentMethod.findMany({
      where: { memberId: id, apartmentId: apt.apartmentId },
      orderBy: { sortOrder: 'asc' },
    });

    return jsonOk({ methods: methods.map(serializeMethod) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const apt = await requireAptSession(req);
    const memberSession = await requireMemberSession(req);
    await requirePermission(memberSession, 'manage_payment_methods');

    const body = await req.json();
    const parsed = paymentMethodSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Validation failed', 400, zodFieldErrors(parsed.error));
    }
    const d = parsed.data;

    const member = await prisma.member.findFirst({
      where: { id, apartmentId: apt.apartmentId },
    });
    if (!member) return jsonError('Member not found', 404);

    const maxOrder = await prisma.memberPaymentMethod.aggregate({
      where: { memberId: id },
      _max: { sortOrder: true },
    });

    const created = await prisma.memberPaymentMethod.create({
      data:
        d.type === 'bank'
          ? {
              apartmentId: apt.apartmentId,
              memberId: id,
              type: 'bank',
              accountNumber: encrypt(d.accountNumber),
              bankName: d.bankName,
              branchName: d.branchName,
              routingNumber: d.routingNumber || null,
              sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
            }
          : {
              apartmentId: apt.apartmentId,
              memberId: id,
              type: 'mfs',
              accountNumber: encrypt(d.accountNumber),
              walletType: d.walletType,
              sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
            },
    });

    return jsonOk({ method: serializeMethod(created) }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
