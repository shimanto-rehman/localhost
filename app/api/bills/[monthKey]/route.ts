import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidMonthKey } from '@/lib/utils';
import { requireAptSession, jsonOk, jsonError, handleApiError } from '@/lib/api-helpers';

type Params = { params: Promise<{ monthKey: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { monthKey } = await params;
    if (!isValidMonthKey(monthKey)) return jsonError('Invalid month key', 400);

    const apt = await requireAptSession(req);
    const bill = await prisma.monthlyBill.findUnique({
      where: { apartmentId_monthKey: { apartmentId: apt.apartmentId, monthKey } },
      include: { adjustments: true },
    });

    return jsonOk(bill);
  } catch (err) {
    return handleApiError(err);
  }
}
