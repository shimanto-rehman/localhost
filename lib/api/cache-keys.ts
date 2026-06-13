export const BOOTSTRAP_KEY = '/api/app/bootstrap';
export const CONFIG_KEY = '/api/config';

export function dashboardYearKey(year: number) {
  return `/api/dashboard/year-summary?year=${year}`;
}

export const DASHBOARD_CURRENT_KEY = '/api/dashboard/current-month';

export function profileKey(year: number) {
  return `/api/profile?year=${year}`;
}

export function billKey(monthKey: string) {
  return `/api/bills/${monthKey}`;
}

export function billCalcKey(monthKey: string) {
  return `/api/bills/${monthKey}/calculation`;
}

export function mealKey(monthKey: string) {
  return `/api/meals/${monthKey}`;
}

export function mealChecklistKey(monthKey: string, week: number) {
  return `/api/meals/${monthKey}/checklist?week=${week}`;
}

export function expenseKey(monthKey: string) {
  return `/api/expenses/${monthKey}`;
}

export const NOTIFICATIONS_KEY = '/api/notifications';
export const AUDIT_EVENTS_KEY = '/api/audit-events';

export function billPaymentsKey(monthKey: string) {
  return `/api/bills/${monthKey}/payments`;
}

export function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
