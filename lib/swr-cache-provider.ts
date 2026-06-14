import type { Cache } from 'swr';
import { BOOTSTRAP_KEY, CONFIG_KEY } from '@/lib/api/cache-keys';

const STORAGE_KEY = 'localhost-swr-cache';

/** Session-sensitive keys — never restore from localStorage (avoids stale member lists). */
const VOLATILE_KEYS = new Set([BOOTSTRAP_KEY, CONFIG_KEY]);

/** Remove volatile keys already stored from older sessions. */
export function purgeVolatileSwrStorage() {
  if (typeof window === 'undefined') return;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as [string, unknown][];
    const cleaned = stored.filter(([key]) => !VOLATILE_KEYS.has(key));
    if (cleaned.length !== stored.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
  } catch {
    // ignore corrupt storage
  }
}

/** SWR cache persisted in localStorage — instant repeat visits, background revalidation. */
export function localStorageProvider(): Cache {
  if (typeof window === 'undefined') {
    return new Map() as Cache;
  }

  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as [string, unknown][];
  const store = new Map(
    stored.filter(([key]) => !VOLATILE_KEYS.has(key)),
  ) as Map<string, unknown>;

  window.addEventListener('beforeunload', () => {
    const entries = Array.from(store.entries())
      .filter(([key]) => !VOLATILE_KEYS.has(key))
      .slice(-80);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  });

  return store as Cache;
}
