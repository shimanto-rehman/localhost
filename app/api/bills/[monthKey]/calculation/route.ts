import { NextRequest } from 'next/server';
import { isValidMonthKey } from '@/lib/utils';
import { getBillCalculation } from '@/lib/bill-calculation';
import { requireAptSession, jsonOk, jsonError, handleApiError, jsonOkCached } from '@/lib/api-helpers';

type Params = { params: Promise<{ monthKey: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { monthKey } = await params;
    if (!isValidMonthKey(monthKey)) return jsonError('Invalid month key', 400);

    const apt = await requireAptSession(req);
    const result = await getBillCalculation(apt.apartmentId, monthKey);
    if (!result) return jsonError('Apartment not found', 404);

    if (result.bill?.isLocked) {
      return jsonOkCached(result, 3600);
    }

    return jsonOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
