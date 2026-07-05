export const DEFAULT_PASSWORD = '1234';
export const APT_SESSION_COOKIE = 'apt_session';
export const MEMBER_SESSION_COOKIE = 'member_session';
export const APT_SESSION_DAYS = 30;
export const MEMBER_SESSION_DAYS = 7;

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const EXPENSE_CATEGORIES = [
  'Food', 'Groceries', 'Utilities', 'Transport',
  'Household', 'Entertainment', 'Medical', 'Other',
] as const;

export const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  Food: '#f59e0b',
  Groceries: '#22c55e',
  Utilities: '#38bdf8',
  Transport: '#a78bfa',
  Household: '#fb7185',
  Entertainment: '#f472b6',
  Medical: '#ef4444',
  Other: '#94a3b8',
};

export const EXPENSE_PLAN_UNITS = [
  'kg', 'ltr', 'pcs', 'dozen', 'pack', 'bottle', 'bag', 'box', 'set', 'pair',
] as const;

export const EXPENSE_PLAN_CATEGORY_ICONS: Record<string, string> = {
  Food: '🍕',
  Groceries: '🛒',
  Utilities: '⚡',
  Transport: '🚗',
  Household: '🏠',
  Entertainment: '🎬',
  Medical: '💊',
  Other: '📦',
};

export const CHART_COLORS = ['#2dd4bf', '#14b8a6', '#0d9488', '#5eead4', '#2ebfa8', '#0f766e'];

export const DEFAULT_FIXED_COSTS = [
  { name: 'Base House Rent', amount: 20000, inFixedBucket: true, sortOrder: 0 },
  { name: 'Gas Bill', amount: 1080, inFixedBucket: true, sortOrder: 1 },
  { name: 'Water Bill', amount: 1000, inFixedBucket: true, sortOrder: 2 },
  { name: 'Building Service Charge', amount: 2000, inFixedBucket: true, sortOrder: 3 },
];

export const DEFAULT_OPTIONAL_COSTS = [
  { name: 'House Maid', amount: 2500, sortOrder: 0 },
  { name: 'Wi-Fi Bill', amount: 800, sortOrder: 1 },
];

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://localhostbill.vercel.app';
export const LOGO_SRC = '/assets/images/Logo.webp';

export const DEVELOPER = {
  name: 'S.M. Obaydur Rahman',
  role: 'Lead Developer & Product Owner',
  bio: 'Designed and built LocalHost for fair, transparent bill splitting in shared flats and messes.',
  photoSrc: '/assets/images/shimanto.jpg',
  portfolioUrl: 'https://www.shimanto.online',
};

export const MFS_WALLET_TYPES = [
  'Bkash', 'Rocket', 'Nagad', 'Upay', 'Tap', 'Surecash', 'OkWallet', 'UCash',
] as const;

export type MfsWalletType = typeof MFS_WALLET_TYPES[number];

/** Expense categories that count toward the automatic meal cost pool (when no fixed rate). */
export const MEAL_POOL_EXPENSE_CATEGORIES = ['Food'] as const;
export const SITE_NAME = 'LocalHost';

/** How guest meal costs are allocated across members. */
export const GUEST_MEAL_MODES = ['EQUAL_SPLIT', 'HOST_PAYS'] as const;
export type GuestMealMode = (typeof GUEST_MEAL_MODES)[number];

export const GUEST_MEAL_MODE_LABELS: Record<GuestMealMode, string> = {
  EQUAL_SPLIT: 'Split equally',
  HOST_PAYS: 'Host pays',
};

export const GUEST_MEAL_MODE_DESCRIPTIONS: Record<GuestMealMode, string> = {
  EQUAL_SPLIT: 'Guest meal cost is shared equally among all members.',
  HOST_PAYS: 'Only the member who brought the guest pays for those meals.',
};
export const SITE_DESCRIPTION =
  'Smart apartment bill splitter for flatmates in Bangladesh. Split rent, utilities, meals, and personal expenses fairly with LocalHost.';
