'use client';

import type { MemberInfo } from '@/components/providers/AppProvider';
import {
  legacyHasPermission,
  type PermissionKey,
} from '@/lib/role-permissions';

export function memberHasPerm(
  member: MemberInfo | null | undefined,
  permission: PermissionKey,
): boolean {
  if (!member) return false;
  if (member.permissions?.includes(permission)) return true;
  return legacyHasPermission(
    { isAdmin: !!member.isAdmin, isBillManager: !!member.isBillManager },
    permission,
  );
}
