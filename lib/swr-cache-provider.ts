import type { Cache } from 'swr';

const STORAGE_KEY = 'localhost-swr-cache';

/** SWR cache persisted in localStorage — instant repeat visits, background revalidation. */
export function localStorageProvider(): Cache {
  if (typeof window === 'undefined') {
    return new Map() as Cache;
  }

  const store = new Map(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')) as Map<
    string,
    unknown
  >;

  window.addEventListener('beforeunload', () => {
    const entries = Array.from(store.entries()).slice(-80);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  });

  return store as Cache;
}
