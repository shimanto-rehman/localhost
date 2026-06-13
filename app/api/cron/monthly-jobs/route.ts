import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonOk, jsonError } from '@/lib/api-helpers';
import { runMonthlyJobsForApartment } from '@/lib/monthly-jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Vercel Cron — 1st of each month, 07:00 Bangladesh (01:00 UTC). */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return jsonError('CRON_SECRET not configured', 503);
  }

  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return jsonError('Unauthorized', 401);
  }

  const apartments = await prisma.apartment.findMany({ select: { id: true } });
  let ran = 0;
  let failed = 0;

  for (const apt of apartments) {
    try {
      await runMonthlyJobsForApartment(apt.id);
      ran += 1;
    } catch (err) {
      failed += 1;
      console.error(`Monthly job failed for ${apt.id}:`, err);
    }
  }

  return jsonOk({ apartments: apartments.length, ran, failed });
}
