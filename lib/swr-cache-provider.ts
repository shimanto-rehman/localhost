import type { Cache } from 'swr';
import { BOOTSTRAP_KEY, CONFIG_KEY } from '@/lib/api/cache-keys';

const STORAGE_KEY = 'localhost-swr-cache';

/** Session-sensitive keys — never persisted/restored (avoids stale member lists & rehydration races). */
const VOLATILE_KEYS = new Set([BOOTSTRAP_KEY, CONFIG_KEY]);

/** Keep the persisted cache small and well under the ~5MB localStorage quota. */
const MAX_ENTRIES = 60;
const MAX_ENTRY_BYTES = 64 * 1024; // skip large blobs (e.g. base64 member photos)
const MAX_TOTAL_BYTES = 2 * 1024 * 1024;

function isPersistableKey(key: unknown): key is string {
  return typeof key === 'string' && !VOLATILE_KEYS.has(key);
}

/** Read + sanitize persisted entries. Any corruption results in a clean slate. */
function readStore(): [string, unknown][] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is [string, unknown] =>
        Array.isArray(entry) && entry.length === 2 && isPersistableKey(entry[0]),
    );
  } catch {
    // Truncated/corrupt storage (e.g. after a quota error mid-write) — discard it.
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return [];
  }
}

/** Strip session keys from any cache persisted by an older build. */
export function purgeVolatileSwrStorage() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readStore()));
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}

/** SWR cache persisted in localStorage — instant repeat visits, background revalidation. */
export function localStorageProvider(): Cache {
  if (typeof window === 'undefined') {
    return new Map() as Cache;
  }

  const store = new Map(readStore()) as Map<string, unknown>;

  const persist = () => {
    try {
      const eligible: [string, unknown][] = [];
      Array.from(store.entries()).forEach(([key, value]) => {
        if (!isPersistableKey(key)) return;
        let serialized: string;
        try {
          serialized = JSON.stringify(value);
        } catch {
          return;
        }
        // Skip oversized entries (base64 photo data URLs) so the store can't bloat.
        if (serialized.length > MAX_ENTRY_BYTES) return;
        eligible.push([key, value]);
      });

      // Keep the most recent entries within the total byte budget.
      const recent = eligible.slice(-MAX_ENTRIES);
      const bounded: [string, unknown][] = [];
      let totalBytes = 0;
      for (let i = recent.length - 1; i >= 0; i--) {
        const bytes = JSON.stringify(recent[i][1]).length;
        if (totalBytes + bytes > MAX_TOTAL_BYTES) break;
        totalBytes += bytes;
        bounded.unshift(recent[i]);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(bounded));
    } catch {
      // Quota exceeded / serialization failure — drop the cache rather than leave it corrupt.
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  };

  // `pagehide` is more reliable than `beforeunload` on mobile Safari / bfcache.
  window.addEventListener('beforeunload', persist);
  window.addEventListener('pagehide', persist);

  return store as Cache;
}
