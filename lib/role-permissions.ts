export type RoleTier = 'member' | 'billManager' | 'admin';

export type PermissionKey =
  | 'view_dashboard'
  | 'view_bills'
  | 'log_own_expenses'
  | 'view_meals'
  | 'manage_own_meal_plan'
  | 'add_meal_shopping'
  | 'lock_bills'
  | 'bill_adjustments'
  | 'manage_meal_checklist'
  | 'finalize_meals'
  | 'manage_meal_settings'
  | 'manage_member_meal_plans'
  | 'view_payment_summary'
  | 'manage_members'
  | 'assign_roles'
  | 'reset_passwords'
  | 'manage_costs'
  | 'manage_optional_assignments'
  | 'manage_rent_split'
  | 'edit_any_expense'
  | 'manage_payment_methods'
  | 'manage_apartment'
  | 'backup_data'
  | 'danger_zone';

export type RolePermissionsConfig = Record<RoleTier, Record<PermissionKey, boolean>>;

export type PermissionCatalogItem = {
  key: PermissionKey;
  label: string;
  hint: string;
  category: string;
  /** Roles that get this permission by default on a fresh apartment. */
  defaultRoles: RoleTier[];
  /** Roles that cannot be turned off in the matrix. */
  lockedRoles?: RoleTier[];
};

/** Single master list — each permission appears once; roles pick from it via their card. */
export const PERMISSION_CATALOG: PermissionCatalogItem[] = [
  {
    key: 'view_dashboard',
    label: 'View dashboard',
    hint: 'Month overview and apartment balances',
    category: 'General',
    defaultRoles: ['member', 'billManager', 'admin'],
    lockedRoles: ['member'],
  },
  {
    key: 'view_bills',
    label: 'View monthly bills',
    hint: 'See split breakdowns and payment summary',
    category: 'General',
    defaultRoles: ['member', 'billManager', 'admin'],
    lockedRoles: ['member'],
  },
  {
    key: 'log_own_expenses',
    label: 'Log own expenses',
    hint: 'Food and shared purchases',
    category: 'General',
    defaultRoles: ['member', 'billManager', 'admin'],
  },
  {
    key: 'view_meals',
    label: 'View meals',
    hint: 'Checklist and monthly meal summary',
    category: 'General',
    defaultRoles: ['member', 'billManager', 'admin'],
  },
  {
    key: 'manage_own_meal_plan',
    label: 'Choose own meal slots',
    hint: 'Opt in or out of breakfast, lunch, etc.',
    category: 'General',
    defaultRoles: ['member', 'billManager', 'admin'],
  },
  {
    key: 'add_meal_shopping',
    label: 'Add meal shopping',
    hint: 'Contribute items to the meal pool',
    category: 'General',
    defaultRoles: ['member', 'billManager', 'admin'],
  },
  {
    key: 'lock_bills',
    label: 'Lock monthly bills',
    hint: 'Set electricity and finalize the month',
    category: 'Bills',
    defaultRoles: ['billManager', 'admin'],
  },
  {
    key: 'bill_adjustments',
    label: 'Bill adjustments',
    hint: 'Credits or extra charges on locked bills',
    category: 'Bills',
    defaultRoles: ['billManager', 'admin'],
  },
  {
    key: 'view_payment_summary',
    label: 'Payment summary',
    hint: 'Who pays the Bill Manager',
    category: 'Bills',
    defaultRoles: ['billManager', 'admin'],
  },
  {
    key: 'manage_meal_checklist',
    label: 'Mark meal attendance',
    hint: 'Confirm who ate each meal',
    category: 'Meals',
    defaultRoles: ['billManager', 'admin'],
  },
  {
    key: 'finalize_meals',
    label: 'Finalize meals',
    hint: 'Lock meal costs for billing',
    category: 'Meals',
    defaultRoles: ['billManager', 'admin'],
  },
  {
    key: 'manage_meal_settings',
    label: 'Meal types & rates',
    hint: 'Slots, week start, fixed rate',
    category: 'Meals',
    defaultRoles: ['billManager', 'admin'],
  },
  {
    key: 'manage_member_meal_plans',
    label: 'Member meal plans',
    hint: 'Assign meal slots for all members',
    category: 'Meals',
    defaultRoles: ['billManager', 'admin'],
  },
  {
    key: 'manage_members',
    label: 'Manage members',
    hint: 'Add, edit, and remove flatmates',
    category: 'Configuration',
    defaultRoles: ['admin'],
    lockedRoles: ['admin'],
  },
  {
    key: 'assign_roles',
    label: 'Assign roles',
    hint: 'Admin and Bill Manager toggles',
    category: 'Configuration',
    defaultRoles: ['admin'],
    lockedRoles: ['admin'],
  },
  {
    key: 'reset_passwords',
    label: 'Reset member passwords',
    hint: 'Help locked-out members',
    category: 'Configuration',
    defaultRoles: ['admin'],
  },
  {
    key: 'manage_costs',
    label: 'Manage cost categories',
    hint: 'Fixed bucket and optional costs',
    category: 'Configuration',
    defaultRoles: ['admin'],
  },
  {
    key: 'manage_optional_assignments',
    label: 'Optional cost assignments',
    hint: 'Who pays Wi‑Fi, maid, etc.',
    category: 'Configuration',
    defaultRoles: ['admin'],
  },
  {
    key: 'manage_rent_split',
    label: 'Rent split rules',
    hint: 'Fixed amounts and member toggles',
    category: 'Configuration',
    defaultRoles: ['admin'],
  },
  {
    key: 'edit_any_expense',
    label: 'Edit any expense',
    hint: 'Not only their own entries',
    category: 'Configuration',
    defaultRoles: ['admin'],
  },
  {
    key: 'manage_payment_methods',
    label: 'Payment methods',
    hint: 'Bank and MFS for Bill Manager',
    category: 'Configuration',
    defaultRoles: ['admin'],
  },
  {
    key: 'manage_apartment',
    label: 'Apartment details',
    hint: 'Address and floor info',
    category: 'Configuration',
    defaultRoles: ['admin'],
  },
  {
    key: 'backup_data',
    label: 'Backup & restore',
    hint: 'Export or import apartment snapshot',
    category: 'Administration',
    defaultRoles: ['admin'],
  },
  {
    key: 'danger_zone',
    label: 'Danger zone',
    hint: 'Reset bills, meals, or all data',
    category: 'Administration',
    defaultRoles: ['admin'],
  },
];

export const ROLE_META: Record<
  RoleTier,
  { title: string; short: string; description: string }
> = {
  member: {
    title: 'General Member',
    short: 'Member',
    description: 'Every flatmate',
  },
  billManager: {
    title: 'Bill Manager',
    short: 'Bill Mgr',
    description: 'Runs bills & meals',
  },
  admin: {
    title: 'Admin',
    short: 'Admin',
    description: 'Full configuration',
  },
};

export const ROLE_ORDER: RoleTier[] = ['member', 'billManager', 'admin'];

function emptyPermissionMap(): Record<PermissionKey, boolean> {
  const map = {} as Record<PermissionKey, boolean>;
  PERMISSION_CATALOG.forEach((p) => {
    map[p.key] = false;
  });
  return map;
}

function buildDefaultConfig(): RolePermissionsConfig {
  const config: RolePermissionsConfig = {
    member: emptyPermissionMap(),
    billManager: emptyPermissionMap(),
    admin: emptyPermissionMap(),
  };
  PERMISSION_CATALOG.forEach((perm) => {
    ROLE_ORDER.forEach((tier) => {
      config[tier][perm.key] =
        perm.defaultRoles.includes(tier) || Boolean(perm.lockedRoles?.includes(tier));
    });
  });
  return config;
}

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionsConfig = buildDefaultConfig();

export function mergeRolePermissions(raw: unknown): RolePermissionsConfig {
  const base = structuredClone(DEFAULT_ROLE_PERMISSIONS);
  if (!raw || typeof raw !== 'object') return base;

  const input = raw as Partial<Record<RoleTier, Record<string, boolean>>>;
  ROLE_ORDER.forEach((tier) => {
    const tierData = input[tier];
    if (!tierData || typeof tierData !== 'object') return;
    PERMISSION_CATALOG.forEach((perm) => {
      if (typeof tierData[perm.key] === 'boolean') {
        base[tier][perm.key] = tierData[perm.key];
      }
    });
    PERMISSION_CATALOG.forEach((perm) => {
      if (perm.lockedRoles?.includes(tier)) {
        base[tier][perm.key] = true;
      }
    });
  });
  return base;
}

export function sanitizeRolePermissionsForSave(
  input: RolePermissionsConfig,
): RolePermissionsConfig {
  const merged = mergeRolePermissions(input);
  PERMISSION_CATALOG.forEach((perm) => {
    perm.lockedRoles?.forEach((tier) => {
      merged[tier][perm.key] = true;
    });
  });
  return merged;
}

export function getEffectivePermissionKeys(
  config: RolePermissionsConfig,
  roles: { isAdmin: boolean; isBillManager: boolean },
): Set<PermissionKey> {
  const keys = new Set<PermissionKey>();
  const addTier = (tier: RoleTier) => {
    Object.entries(config[tier]).forEach(([key, allowed]) => {
      if (allowed) keys.add(key as PermissionKey);
    });
  };
  addTier('member');
  if (roles.isBillManager) addTier('billManager');
  if (roles.isAdmin) addTier('admin');
  return keys;
}

export function hasPermission(
  keys: Set<PermissionKey>,
  permission: PermissionKey,
): boolean {
  return keys.has(permission);
}

export function legacyHasPermission(
  member: { isAdmin: boolean; isBillManager: boolean },
  permission: PermissionKey,
): boolean {
  const keys = getEffectivePermissionKeys(DEFAULT_ROLE_PERMISSIONS, member);
  return keys.has(permission);
}

export function catalogByCategory(): { category: string; items: PermissionCatalogItem[] }[] {
  const groups: Record<string, PermissionCatalogItem[]> = {};
  PERMISSION_CATALOG.forEach((item) => {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
  });
  return Object.entries(groups).map(([category, items]) => ({ category, items }));
}

export async function loadRolePermissionsConfig(apartmentId: string) {
  const { prisma } = await import('./prisma');
  const apt = await prisma.apartment.findUnique({
    where: { id: apartmentId },
    select: { rolePermissions: true },
  });
  return mergeRolePermissions(apt?.rolePermissions);
}

export async function resolveMemberPermissionKeys(
  apartmentId: string,
  memberId: string,
): Promise<Set<PermissionKey>> {
  const { prisma } = await import('./prisma');
  const apt = await prisma.apartment.findUnique({
    where: { id: apartmentId },
    select: { adminMemberId: true, billManagerId: true, rolePermissions: true },
  });
  if (!apt) return new Set();
  const config = mergeRolePermissions(apt.rolePermissions);
  return getEffectivePermissionKeys(config, {
    isAdmin: apt.adminMemberId === memberId,
    isBillManager: apt.billManagerId === memberId,
  });
}
