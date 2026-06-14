import { preload } from 'swr';
import { apiFetch } from './fetcher';
import {
  BOOTSTRAP_KEY,
  CONFIG_KEY,
  DASHBOARD_CURRENT_KEY,
  dashboardYearKey,
  billKey,
  billCalcKey,
  mealKey,
  mealChecklistKey,
  expenseKey,
  profileKey,
  currentMonthKey,
} from './cache-keys';

function preloadKey(key: string) {
  preload(key, apiFetch).catch(() => {
    // Prefetch is best-effort — a failed warm-up should not break navigation.
  });
}

/** Prefetch API data for a route before the user navigates. */
export function prefetchRoute(href: string) {
  const year = new Date().getFullYear();
  const mk = currentMonthKey();

  switch (href) {
    case '/dashboard':
      preloadKey(DASHBOARD_CURRENT_KEY);
      preloadKey(dashboardYearKey(year));
      break;
    case '/bills':
      preloadKey(billKey(mk));
      preloadKey(billCalcKey(mk));
      break;
    case '/meals':
      preloadKey(mealKey(mk));
      preloadKey(mealChecklistKey(mk, 0));
      break;
    case '/expenses':
      preloadKey(expenseKey(mk));
      break;
    case '/profile':
      preloadKey(profileKey(year));
      break;
    case '/settings':
      preloadKey(CONFIG_KEY);
      break;
    default:
      break;
  }
}

/** Warm common session data after bootstrap — stagger heavy calls to avoid DB connection storms. */
export function prefetchAppShell() {
  preloadKey(DASHBOARD_CURRENT_KEY);
  const year = new Date().getFullYear();
  window.setTimeout(() => preloadKey(CONFIG_KEY), 800);
  window.setTimeout(() => preloadKey(dashboardYearKey(year)), 2000);
}
