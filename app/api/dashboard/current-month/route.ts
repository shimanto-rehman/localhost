import { NextRequest } from 'next/server';
import { monthKey } from '@/lib/utils';
import { requireAptSession, jsonOk, handleApiError } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const mk = monthKey(new Date());
    const baseUrl = req.nextUrl.origin;

    const [calcRes, mealRes] = await Promise.all([
      fetch(`${baseUrl}/api/bills/${mk}/calculation`, {
        headers: { cookie: req.headers.get('cookie') || '' },
      }),
      fetch(`${baseUrl}/api/meals/${mk}`, {
        headers: { cookie: req.headers.get('cookie') || '' },
      }),
    ]);

    const calculation = calcRes.ok ? (await calcRes.json()).calculation : null;
    const mealData = mealRes.ok ? await mealRes.json() : null;

    return jsonOk({
      monthKey: mk,
      calculation,
      mealSummary: mealData?.summary,
      totalMealsThisMonth: mealData?.summary?.totalMealCount || 0,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
