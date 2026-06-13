import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mealShoppingSchema, zodFieldErrors } from '@/lib/validation';
import {
  requireAptSession,
  requireMemberSession,
  requirePermission,
  memberCan,
  jsonOk,
  jsonError,
  handleApiError,
} from '@/lib/api-helpers';

type Params = { params: Promise<{ monthKey: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { monthKey } = await params;
    const apt = await requireAptSession(req);
    const shopping = await prisma.mealShopping.findMany({
      where: { apartmentId: apt.apartmentId, monthKey },
      include: { member: { select: { id: true, name: true } } },
      orderBy: { purchaseDate: 'desc' },
    });
    return jsonOk(shopping);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { monthKey } = await params;
    const apt = await requireAptSession(req);
    const memberSession = await requireMemberSession(req);

    const body = await req.json();
    const parsed = mealShoppingSchema.safeParse(body);
    if (!parsed.success) return jsonError('Validation failed', 400, zodFieldErrors(parsed.error));

    const targetMemberId = parsed.data.memberId;
    if (targetMemberId === memberSession.memberId) {
      await requirePermission(memberSession, 'add_meal_shopping');
    } else if (!(await memberCan(memberSession, 'manage_meal_checklist'))) {
      return jsonError('Cannot add shopping for another member', 403);
    }

    const entry = await prisma.mealShopping.create({
      data: {
        apartmentId: apt.apartmentId,
        memberId: targetMemberId,
        monthKey,
        itemName: parsed.data.itemName,
        amount: parsed.data.amount,
        purchaseDate: new Date(parsed.data.purchaseDate),
        addedById: memberSession.memberId,
      },
    });

    return jsonOk(entry, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
