import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAptSession,
  requireMemberSession,
  requirePermission,
  jsonOk,
  jsonError,
  handleApiError,
} from '@/lib/api-helpers';
import { getApartmentConfig } from '@/lib/apartment-data';
import { formatAddress } from '@/lib/utils';
import { mergeRolePermissions } from '@/lib/role-permissions';
import { CURRENCIES } from '@/lib/currencies';

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
        currency: config.apartment.currency,
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

export async function PATCH(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    await requirePermission(member, 'manage_costs');

    const body = await req.json();
    const { currency } = body;

    if (!currency || typeof currency !== 'string') {
      return jsonError('Currency code required', 400);
    }

    // Validate currency code
    const validCurrency = CURRENCIES.find((c) => c.code === currency);
    if (!validCurrency) {
      return jsonError('Invalid currency code', 400);
    }

    await prisma.apartment.update({
      where: { id: apt.apartmentId },
      data: { currency },
    });

    return jsonOk({ currency });
  } catch (err) {
    return handleApiError(err);
  }
}
