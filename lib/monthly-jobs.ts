import { prisma } from './prisma';
import { getBillCalculation } from './bill-calculation';
import { createNotification, createNotificationsForMembers } from './notifications';
import { monthLabel, parseMonthKey } from './utils';
import { MONTH_NAMES } from './constants';
import { logAudit } from './api-helpers';

const DUE_LABEL_PREFIX = 'Due · ';

function previousMonthKey(monthKey: string): string {
  const d = parseMonthKey(monthKey);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function dueLabelForMonth(monthKey: string): string {
  const d = parseMonthKey(monthKey);
  return `${DUE_LABEL_PREFIX}${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

/** Runs once per apartment per calendar month (on first app access). */
export async function runMonthlyJobsForApartment(apartmentId: string) {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const jobKey = `month_open:${monthKey}`;

  const existing = await prisma.apartmentJobRun.findUnique({
    where: { apartmentId_jobKey: { apartmentId, jobKey } },
  });
  if (existing) return;

  const members = await prisma.member.findMany({
    where: { apartmentId, isActive: true },
    select: { id: true },
  });
  const memberIds = members.map((m) => m.id);
  if (!memberIds.length) return;

  const prevMonthKey = previousMonthKey(monthKey);

  // Ensure current month bill row exists for due adjustments.
  let currentBill = await prisma.monthlyBill.findUnique({
    where: { apartmentId_monthKey: { apartmentId, monthKey } },
  });
  if (!currentBill) {
    currentBill = await prisma.monthlyBill.create({
      data: { apartmentId, monthKey, snapshot: {} },
    });
  }

  const prevBill = await prisma.monthlyBill.findUnique({
    where: { apartmentId_monthKey: { apartmentId, monthKey: prevMonthKey } },
    include: { memberPayments: true, adjustments: true },
  });

  if (prevBill?.isLocked) {
    const payments = prevBill.memberPayments.length
      ? prevBill.memberPayments
      : await syncPaymentsFromCalculation(apartmentId, prevMonthKey, prevBill.id);

    for (const pay of payments) {
      const balance = pay.amountDue - pay.amountPaid;
      if (balance <= 0 || pay.status === 'paid') continue;

      const dueLabel = dueLabelForMonth(prevMonthKey);
      const already = await prisma.billAdjustment.findFirst({
        where: {
          billId: currentBill.id,
          memberId: pay.memberId,
          label: dueLabel,
        },
      });
      if (!already) {
        await prisma.billAdjustment.create({
          data: {
            billId: currentBill.id,
            memberId: pay.memberId,
            type: 'lend',
            label: dueLabel,
            amount: balance,
          },
        });
        await createNotification({
          apartmentId,
          memberId: pay.memberId,
          type: 'bill_due_carried',
          title: `${monthLabel(parseMonthKey(prevMonthKey))} balance carried forward`,
          body: `৳${balance.toLocaleString('en-BD')} from last month was added to this month's bill as due.`,
          href: '/bills',
          meta: { monthKey, prevMonthKey, amount: balance },
        });
        await logAudit(apartmentId, 'BILL_DUE_CARRIED', undefined, 'member', pay.memberId, {
          monthKey,
          prevMonthKey,
          amount: balance,
        });
      }
    }
  }

  // 1st-of-month reminder — all members.
  await createNotificationsForMembers(apartmentId, memberIds, {
    type: 'electricity_reminder',
    title: `Submit electricity bill — ${monthLabel(now)}`,
    body: 'It\'s the 1st of the month. Ask the Bill Manager to enter the electricity amount so this month\'s bills can be generated.',
    href: '/bills',
    meta: { monthKey },
  });

  await prisma.apartmentJobRun.create({
    data: { apartmentId, jobKey },
  });

  await logAudit(apartmentId, 'MONTH_OPEN_JOB', undefined, 'apartment', apartmentId, { monthKey });
}

async function syncPaymentsFromCalculation(
  apartmentId: string,
  monthKey: string,
  billId: string,
) {
  const calc = await getBillCalculation(apartmentId, monthKey);
  if (!calc?.calculation?.results) return [];

  const rows = calc.calculation.results.map((r) => ({
    billId,
    memberId: r.id,
    status: 'unpaid',
    amountDue: r.total,
    amountPaid: 0,
  }));

  await prisma.billMemberPayment.createMany({
    data: rows,
    skipDuplicates: true,
  });

  return prisma.billMemberPayment.findMany({ where: { billId } });
}
