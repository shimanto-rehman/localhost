import { prisma } from './prisma';

/** Permanently remove a member and detach or delete related records. */
export async function deleteMemberFromApartment(apartmentId: string, memberId: string) {
  const existing = await prisma.member.findFirst({
    where: { id: memberId, apartmentId },
  });
  if (!existing) return false;

  await prisma.$transaction(async (tx) => {
    const apartment = await tx.apartment.findUnique({ where: { id: apartmentId } });
    if (apartment?.adminMemberId === memberId || apartment?.billManagerId === memberId) {
      await tx.apartment.update({
        where: { id: apartmentId },
        data: {
          adminMemberId: apartment.adminMemberId === memberId ? null : apartment.adminMemberId,
          billManagerId: apartment.billManagerId === memberId ? null : apartment.billManagerId,
        },
      });
    }

    await tx.monthlyBill.updateMany({
      where: { lockedById: memberId },
      data: { lockedById: null },
    });
    await tx.billMemberPayment.updateMany({
      where: { updatedById: memberId },
      data: { updatedById: null },
    });
    await tx.mealShopping.updateMany({
      where: { addedById: memberId },
      data: { addedById: null },
    });
    await tx.mealMonth.updateMany({
      where: { finalizedById: memberId },
      data: { finalizedById: null },
    });
    await tx.auditEvent.updateMany({
      where: { actorMemberId: memberId },
      data: { actorMemberId: null },
    });

    await tx.billAdjustment.deleteMany({ where: { memberId } });
    await tx.mealShopping.deleteMany({ where: { memberId } });
    await tx.expense.deleteMany({ where: { memberId } });

    await tx.member.delete({ where: { id: memberId } });
  });

  return true;
}
