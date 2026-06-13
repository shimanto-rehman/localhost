'use client';

import { useEffect, useState } from 'react';
import { SWRConfig } from 'swr';
import { apiFetch } from '@/lib/api/fetcher';
import { localStorageProvider } from '@/lib/swr-cache-provider';

const sharedConfig = {
  fetcher: apiFetch,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 15_000,
  focusThrottleInterval: 30_000,
  errorRetryCount: 3,
  errorRetryInterval: 5_000,
  shouldRetryOnError: true,
  keepPreviousData: true,
};

/**
 * localStorage-backed SWR cache only after mount — avoids hydration mismatch
 * (server and first client paint both use an empty in-memory cache).
 */
export function SWRProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return <SWRConfig value={sharedConfig}>{children}</SWRConfig>;
  }

  return (
    <SWRConfig value={{ ...sharedConfig, provider: localStorageProvider }}>
      {children}
    </SWRConfig>
  );
}
