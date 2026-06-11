import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';
import { bankAccountSchema, zodFieldErrors } from '@/lib/validation';
import {
  requireAptSession,
  requireMemberSession,
  requireAdmin,
  jsonOk,
  jsonError,
  handleApiError,
} from '@/lib/api-helpers';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const apt = await requireAptSession(req);

    const account = await prisma.bankAccount.findFirst({
      where: { memberId: id, apartmentId: apt.apartmentId },
    });
    if (!account) return jsonError('No bank account on file', 404);

    return jsonOk({
      accountNumber: decrypt(account.accountNumber),
      bankName: account.bankName,
      branchName: account.branchName,
      routingNumber: account.routingNumber,
      accountType: account.accountType,
      mobileBankingNumber: account.mobileBankingNumber
        ? decrypt(account.mobileBankingNumber)
        : null,
      mobileBankingType: account.mobileBankingType,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const apt = await requireAptSession(req);
    const memberSession = await requireMemberSession(req);
    requireAdmin(memberSession);

    const body = await req.json();
    const parsed = bankAccountSchema.safeParse(body);
    if (!parsed.success) return jsonError('Validation failed', 400, zodFieldErrors(parsed.error));
    const d = parsed.data;

    const member = await prisma.member.findFirst({
      where: { id, apartmentId: apt.apartmentId },
    });
    if (!member) return jsonError('Member not found', 404);

    const data = {
      apartmentId: apt.apartmentId,
      memberId: id,
      accountNumber: encrypt(d.accountNumber),
      bankName: d.bankName,
      branchName: d.branchName || null,
      routingNumber: d.routingNumber || null,
      accountType: d.accountType || null,
      mobileBankingNumber: d.mobileBankingNumber ? encrypt(d.mobileBankingNumber) : null,
      mobileBankingType: d.mobileBankingType || null,
    };

    const account = await prisma.bankAccount.upsert({
      where: { memberId: id },
      create: data,
      update: data,
    });

    return jsonOk({ id: account.id, success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
