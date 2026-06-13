'use client';

import { createContext, useCallback, useContext, useEffect, ReactNode } from 'react';
import useSWR from 'swr';
import { BOOTSTRAP_KEY } from '@/lib/api/cache-keys';
import { prefetchAppShell } from '@/lib/api/prefetch';

export interface MemberInfo {
  id: string;
  name: string;
  photoUrl?: string | null;
  isAdmin?: boolean;
  isBillManager?: boolean;
  isActive?: boolean;
  email?: string | null;
  phone?: string | null;
  permissions?: string[];
}

export interface ApartmentInfo {
  id: string;
  registrationId: string;
  name: string;
  address: string;
  aptFloor?: string | null;
  adminMemberId?: string | null;
  billManagerId?: string | null;
  members?: { id: string; name: string; photoUrl?: string | null }[];
}

interface BootstrapData {
  apartment: ApartmentInfo;
  members: MemberInfo[];
  member: MemberInfo | null;
}

interface AppContextValue {
  apartment: ApartmentInfo | null;
  members: MemberInfo[];
  currentMember: MemberInfo | null;
  loading: boolean;
  isValidating: boolean;
  error: Error | undefined;
  refresh: () => Promise<void>;
  setCurrentMember: (m: MemberInfo | null) => void;
}

const AppContext = createContext<AppContextValue>({
  apartment: null,
  members: [],
  currentMember: null,
  loading: true,
  isValidating: false,
  error: undefined,
  refresh: async () => {},
  setCurrentMember: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<BootstrapData>(BOOTSTRAP_KEY, {
    revalidateOnMount: true,
    dedupingInterval: 30_000,
  });

  const apartment = data?.apartment ?? null;
  const members = data?.members ?? [];
  const currentMember = data?.member ?? null;
  const loading = isLoading && !data;

  const refresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  const setCurrentMember = useCallback(
    (m: MemberInfo | null) => {
      mutate(
        (prev) => (prev ? { ...prev, member: m } : prev),
        { revalidate: false },
      );
    },
    [mutate],
  );

  useEffect(() => {
    if (data?.apartment) prefetchAppShell();
  }, [data?.apartment]);

  return (
    <AppContext.Provider
      value={{
        apartment,
        members,
        currentMember,
        loading,
        isValidating,
        error,
        refresh,
        setCurrentMember,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
