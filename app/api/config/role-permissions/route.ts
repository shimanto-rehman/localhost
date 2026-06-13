import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  DEFAULT_ROLE_PERMISSIONS,
  mergeRolePermissions,
  sanitizeRolePermissionsForSave,
  type RolePermissionsConfig,
} from '@/lib/role-permissions';
import {
  requireAptSession,
  requireMemberSession,
  requirePermission,
  jsonOk,
  handleApiError,
} from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const apartment = await prisma.apartment.findUnique({
      where: { id: apt.apartmentId },
      select: { rolePermissions: true },
    });
    const rolePermissions = mergeRolePermissions(apartment?.rolePermissions);
    return jsonOk({ rolePermissions, defaults: DEFAULT_ROLE_PERMISSIONS });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const apt = await requireAptSession(req);
    const member = await requireMemberSession(req);
    await requirePermission(member, 'assign_roles');

    const body = await req.json();
    const rolePermissions = sanitizeRolePermissionsForSave(
      body.rolePermissions as RolePermissionsConfig,
    );

    await prisma.apartment.update({
      where: { id: apt.apartmentId },
      data: { rolePermissions: JSON.parse(JSON.stringify(rolePermissions)) },
    });

    return jsonOk({ rolePermissions });
  } catch (err) {
    return handleApiError(err);
  }
}
