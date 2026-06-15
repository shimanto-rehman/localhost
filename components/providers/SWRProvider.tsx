'use client';

import { SWRConfig } from 'swr';
import { apiFetch } from '@/lib/api/fetcher';
import { localStorageProvider } from '@/lib/swr-cache-provider';

/**
 * Single, stable SWR config for the whole app lifetime.
 *
 * The `provider` is intentionally NOT swapped at runtime: switching providers
 * after mount creates a second isolated cache and orphans any in-flight request
 * (e.g. the bootstrap fetch on a hard reload), which left the app stuck on the
 * preloader. `localStorageProvider` is SSR-safe (returns an empty Map on the
 * server) and never restores session keys, so there is no hydration mismatch.
 */
const swrConfig = {
  fetcher: apiFetch,
  provider: localStorageProvider,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 15_000,
  focusThrottleInterval: 30_000,
  errorRetryCount: 3,
  errorRetryInterval: 5_000,
  shouldRetryOnError: true,
  keepPreviousData: true,
};

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
}
