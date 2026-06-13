import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  requireAptSession,
  requireMemberSession,
  jsonOk,
  jsonError,
  handleApiError,
  logAudit,
} from '@/lib/api-helpers';
import { sendBugReportEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';

const bugReportSchema = z.object({
  description: z.string().min(10).max(2000),
  pageUrl: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);

    const body = await req.json();
    const parsed = bugReportSchema.safeParse(body);
    if (!parsed.success) return jsonError('Please describe the issue (at least 10 characters)', 400);

    const apartment = await prisma.apartment.findUnique({
      where: { id: apt.apartmentId },
      select: { name: true },
    });
    const reporter = await prisma.member.findUnique({
      where: { id: member.memberId },
      select: { name: true, email: true },
    });

    const emailed = await sendBugReportEmail({
      apartmentName: apartment?.name || 'Unknown',
      reporterName: reporter?.name || 'Member',
      reporterEmail: reporter?.email,
      description: parsed.data.description,
      pageUrl: parsed.data.pageUrl,
    });

    await logAudit(apt.apartmentId, 'BUG_REPORT', member.memberId, 'member', member.memberId, {
      pageUrl: parsed.data.pageUrl,
      emailed,
      preview: parsed.data.description.slice(0, 120),
    });

    return jsonOk({
      success: true,
      emailed,
      message: emailed
        ? 'Bug report sent. Thank you!'
        : 'Bug report logged. Email is not configured on this server.',
    });
  } catch (err) {
    return handleApiError(err);
  }
}
