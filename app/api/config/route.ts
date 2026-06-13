import { NextRequest } from 'next/server';
import { requireAptSession, jsonOk, handleApiError } from '@/lib/api-helpers';
import { getApartmentConfig } from '@/lib/apartment-data';
import { formatAddress } from '@/lib/utils';
import { mergeRolePermissions } from '@/lib/role-permissions';

export async function GET(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const config = await getApartmentConfig(apt.apartmentId);
    if (!config) return jsonOk(null);

    const fixedBucketTotal = config.fixedCosts
      .filter((c) => c.inFixedBucket)
      .reduce((s, c) => s + c.amount, 0);

    return jsonOk({
      apartment: {
        id: config.apartment.id,
        registrationId: config.apartment.registrationId,
        name: config.apartment.name,
        address: formatAddress(config.apartment),
        addressRoad: config.apartment.addressRoad,
        addressCity: config.apartment.addressCity,
        addressPostal: config.apartment.addressPostal,
        addressCountry: config.apartment.addressCountry,
        aptFloor: config.apartment.aptFloor,
        aptType: config.apartment.aptType,
        moveInDate: config.apartment.moveInDate?.toISOString().slice(0, 10),
        adminMemberId: config.apartment.adminMemberId,
        billManagerId: config.apartment.billManagerId,
      },
      members: config.members,
      fixedCosts: config.fixedCosts,
      fixedBucketTotal,
      optionalCosts: config.optionalCosts,
      optInMatrix: config.optInMatrix,
      rentSplits: config.rentSplits,
      mealConfig: config.mealConfig,
      mealSlotOptInMatrix: config.mealSlotOptInMatrix,
      rolePermissions: mergeRolePermissions(config.apartment.rolePermissions),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
