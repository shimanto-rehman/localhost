'use client';

import { SWRConfig } from 'swr';
import { apiFetch } from '@/lib/api/fetcher';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: apiFetch,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 15_000,
        focusThrottleInterval: 30_000,
        errorRetryCount: 3,
        errorRetryInterval: 5_000,
        shouldRetryOnError: true,
        keepPreviousData: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
