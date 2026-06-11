import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAptSession, jsonOk, handleApiError } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const bills = await prisma.monthlyBill.findMany({
      where: { apartmentId: apt.apartmentId },
      orderBy: { monthKey: 'desc' },
      include: { adjustments: true },
    });
    return jsonOk(bills);
  } catch (err) {
    return handleApiError(err);
  }
}
