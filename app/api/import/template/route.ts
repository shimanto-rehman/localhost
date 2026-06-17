import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAptSession,
  requireMemberSession,
  handleApiError,
  jsonError,
} from '@/lib/api-helpers';
import {
  XLSX_MIME,
  loadWorkbook,
  workbookToBuffer,
  fillDashboardMeta,
  fillRoster,
  fillMealSlotLabels,
  ROSTER,
  slugify,
} from '@/lib/excel-template';

const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function GET(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);

    const monthKey = req.nextUrl.searchParams.get('monthKey') || '';
    if (monthKey && !MONTH_KEY_RE.test(monthKey)) {
      return jsonError('Invalid monthKey. Expected YYYY-MM.', 400);
    }
    const effectiveMonthKey = monthKey || new Date().toISOString().slice(0, 7);

    const [apartment, members, currentMember, mealConfig] = await Promise.all([
      prisma.apartment.findUnique({
        where: { id: apt.apartmentId },
        select: {
          name: true,
          registrationId: true,
          adminMemberId: true,
          billManagerId: true,
        },
      }),
      prisma.member.findMany({
        where: { apartmentId: apt.apartmentId, isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, email: true, phone: true },
        take: ROSTER.lastRow - ROSTER.firstRow + 1,
      }),
      prisma.member.findUnique({
        where: { id: member.memberId },
        select: { name: true, email: true, phone: true },
      }),
      prisma.mealConfig.findUnique({
        where: { apartmentId: apt.apartmentId },
        select: { mealNames: true },
      }),
    ]);

    const wb = await loadWorkbook();
    fillDashboardMeta(wb, {
      apartment,
      monthKey: effectiveMonthKey,
      preparedBy: currentMember,
      submissionDate: new Date(),
    });
    fillRoster(wb, { members, apartment });
    if (mealConfig?.mealNames?.length) fillMealSlotLabels(wb, mealConfig.mealNames);

    const out = await workbookToBuffer(wb);

    const filename = `LocalHost_${slugify(apartment?.name || 'apartment', 'apartment')}_${effectiveMonthKey}.xlsx`;

    return new Response(new Uint8Array(out), {
      headers: {
        'Content-Type': XLSX_MIME,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(out.length),
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
