import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { seedApartmentDefaults } from '@/lib/apartment-data';
import {
  requireAptSession,
  requireMemberSession,
  requirePermission,
  jsonOk,
  jsonError,
  handleApiError,
  logAudit,
} from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    await requirePermission(member, 'danger_zone');

    const { confirm } = await req.json();
    if (confirm !== 'RESET') {
      return jsonError('Type RESET to confirm', 400);
    }

    const apartmentId = apt.apartmentId;
    const adminMember = await prisma.member.findFirst({
      where: { id: member.memberId, apartmentId },
    });
    if (!adminMember) return jsonError('Member not found', 404);

    await prisma.$transaction(async (tx) => {
      await tx.billAdjustment.deleteMany({ where: { bill: { apartmentId } } });
      await tx.monthlyBill.deleteMany({ where: { apartmentId } });
      await tx.mealRecord.deleteMany({ where: { apartmentId } });
      await tx.mealShopping.deleteMany({ where: { apartmentId } });
      await tx.mealMonth.deleteMany({ where: { apartmentId } });
      await tx.expense.deleteMany({ where: { apartmentId } });
      await tx.optionalCostMember.deleteMany({ where: { optionalCost: { apartmentId } } });
      await tx.optionalCost.deleteMany({ where: { apartmentId } });
      await tx.fixedCost.deleteMany({ where: { apartmentId } });
      await tx.rentSplit.deleteMany({ where: { apartmentId } });
      await tx.memberPaymentMethod.deleteMany({ where: { apartmentId } });
      await tx.memberSession.deleteMany({ where: { member: { apartmentId } } });
      await tx.passwordResetToken.deleteMany({ where: { member: { apartmentId } } });
      await tx.member.deleteMany({ where: { apartmentId } });
      await tx.mealConfig.deleteMany({ where: { apartmentId } });
    });

    const newMember = await prisma.member.create({
      data: {
        apartmentId,
        name: adminMember.name,
        email: adminMember.email,
        phone: adminMember.phone,
        passwordHash: adminMember.passwordHash,
        isActive: true,
      },
    });

    await prisma.apartment.update({
      where: { id: apartmentId },
      data: { adminMemberId: newMember.id, billManagerId: newMember.id },
    });

    await seedApartmentDefaults(apartmentId, [newMember.id]);
    await logAudit(apartmentId, 'RESET_ALL', member.memberId);

    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
