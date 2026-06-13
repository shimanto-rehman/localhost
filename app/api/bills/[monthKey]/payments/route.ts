import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidMonthKey } from '@/lib/utils';
import { getBillCalculation } from '@/lib/bill-calculation';
import {
  requireAptSession,
  requireMemberSession,
  requireBillManagerOrAdmin,
  jsonOk,
  jsonError,
  handleApiError,
  logAudit,
} from '@/lib/api-helpers';
import { createNotification } from '@/lib/notifications';
import { MONTH_NAMES } from '@/lib/constants';
import { parseMonthKey } from '@/lib/utils';
import { z } from 'zod';

type Params = { params: Promise<{ monthKey: string }> };

const paymentSchema = z.object({
  memberId: z.string().uuid(),
  status: z.enum(['unpaid', 'partial', 'paid']),
  amountPaid: z.number().int().min(0).optional(),
});

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { monthKey } = await params;
    if (!isValidMonthKey(monthKey)) return jsonError('Invalid month key', 400);

    const apt = await requireAptSession(req);
    const bill = await prisma.monthlyBill.findUnique({
      where: { apartmentId_monthKey: { apartmentId: apt.apartmentId, monthKey } },
      include: { memberPayments: true },
    });

    if (!bill) return jsonOk({ payments: [] });

    let payments = bill.memberPayments;
    if (!payments.length && bill.isLocked) {
      const calc = await getBillCalculation(apt.apartmentId, monthKey);
      if (calc?.calculation?.results) {
        await prisma.billMemberPayment.createMany({
          data: calc.calculation.results.map((r) => ({
            billId: bill.id,
            memberId: r.id,
            status: 'unpaid',
            amountDue: r.total,
            amountPaid: 0,
          })),
          skipDuplicates: true,
        });
        payments = await prisma.billMemberPayment.findMany({ where: { billId: bill.id } });
      }
    }

    return jsonOk({
      payments: payments.map((p) => ({
        memberId: p.memberId,
        status: p.status,
        amountDue: p.amountDue,
        amountPaid: p.amountPaid,
        balance: p.amountDue - p.amountPaid,
        updatedAt: p.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { monthKey } = await params;
    if (!isValidMonthKey(monthKey)) return jsonError('Invalid month key', 400);

    const apt = await requireAptSession(req);
    const actor = await requireMemberSession(req);
    requireBillManagerOrAdmin(actor);

    const bill = await prisma.monthlyBill.findUnique({
      where: { apartmentId_monthKey: { apartmentId: apt.apartmentId, monthKey } },
    });
    if (!bill?.isLocked) return jsonError('Bill must be locked before recording payments', 400);

    const body = await req.json();
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) return jsonError('Invalid payment data', 400);

    const calc = await getBillCalculation(apt.apartmentId, monthKey);
    const memberResult = calc?.calculation?.results.find((r) => r.id === parsed.data.memberId);
    if (!memberResult) return jsonError('Member not found in bill', 404);

    const amountDue = memberResult.total;
    let amountPaid = parsed.data.amountPaid ?? 0;
    let status = parsed.data.status;

    if (status === 'paid') {
      amountPaid = amountDue;
    } else if (status === 'unpaid') {
      amountPaid = 0;
    } else if (status === 'partial') {
      if (amountPaid <= 0 || amountPaid >= amountDue) {
        return jsonError('Partial payment must be between 1 and total minus 1', 400);
      }
    }

    const payment = await prisma.billMemberPayment.upsert({
      where: { billId_memberId: { billId: bill.id, memberId: parsed.data.memberId } },
      create: {
        billId: bill.id,
        memberId: parsed.data.memberId,
        status,
        amountDue,
        amountPaid,
        updatedById: actor.memberId,
      },
      update: {
        status,
        amountDue,
        amountPaid,
        updatedById: actor.memberId,
      },
    });

    const member = await prisma.member.findUnique({
      where: { id: parsed.data.memberId },
      select: { name: true },
    });
    const monthDate = parseMonthKey(monthKey);
    const monthName = `${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()}`;
    const balance = amountDue - amountPaid;

    if (status === 'paid') {
      await createNotification({
        apartmentId: apt.apartmentId,
        memberId: parsed.data.memberId,
        type: 'bill_paid',
        title: `${monthName} bill received`,
        body: `Your ${monthName} monthly bill was received by the Bill Manager.`,
        href: '/bills',
        meta: { monthKey, amountPaid },
      });
    } else if (status === 'partial') {
      await createNotification({
        apartmentId: apt.apartmentId,
        memberId: parsed.data.memberId,
        type: 'bill_partial',
        title: `Partial payment recorded — ${monthName}`,
        body: `৳${amountPaid.toLocaleString('en-BD')} received. Please pay the remaining ৳${balance.toLocaleString('en-BD')}.`,
        href: '/bills',
        meta: { monthKey, amountPaid, balance },
      });
    }

    await logAudit(apt.apartmentId, 'BILL_PAYMENT_UPDATED', actor.memberId, 'member', parsed.data.memberId, {
      monthKey,
      status,
      amountDue,
      amountPaid,
      memberName: member?.name,
    });

    return jsonOk({
      payment: {
        memberId: payment.memberId,
        status: payment.status,
        amountDue: payment.amountDue,
        amountPaid: payment.amountPaid,
        balance: payment.amountDue - payment.amountPaid,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
