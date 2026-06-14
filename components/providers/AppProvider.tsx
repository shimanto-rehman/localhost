'use client';

import { createContext, useCallback, useContext, useEffect, ReactNode } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { BOOTSTRAP_KEY, CONFIG_KEY } from '@/lib/api/cache-keys';
import { apiFetch } from '@/lib/api/fetcher';
import { patchBootstrapMembers, type ApartmentInfo, type BootstrapData, type MemberInfo } from '@/lib/member-bootstrap-cache';
import { prefetchAppShell } from '@/lib/api/prefetch';
import { purgeVolatileSwrStorage } from '@/lib/swr-cache-provider';

export type { MemberInfo, ApartmentInfo } from '@/lib/member-bootstrap-cache';

interface AppContextValue {
  apartment: ApartmentInfo | null;
  members: MemberInfo[];
  currentMember: MemberInfo | null;
  loading: boolean;
  isValidating: boolean;
  error: Error | undefined;
  refresh: () => Promise<void>;
  refreshMembers: () => Promise<void>;
  addMemberToCache: (member: MemberInfo) => void;
  removeMemberFromCache: (memberId: string) => void;
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
  refreshMembers: async () => {},
  addMemberToCache: () => {},
  removeMemberFromCache: () => {},
  setCurrentMember: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<BootstrapData>(BOOTSTRAP_KEY, {
    revalidateOnMount: true,
    dedupingInterval: 5_000,
    keepPreviousData: false,
  });

  const apartment = data?.apartment ?? null;
  const members = data?.members ?? [];
  const currentMember = data?.member ?? null;
  const loading = isLoading && !data;

  const applyBootstrap = useCallback(
    (next: BootstrapData) => {
      void mutate(next, { revalidate: false, populateCache: true });
      void globalMutate(BOOTSTRAP_KEY, next, { revalidate: false, populateCache: true });
    },
    [mutate],
  );

  const patchMembersCache = useCallback(
    (updater: (members: MemberInfo[]) => MemberInfo[]) => {
      void mutate(
        (prev) => {
          if (!prev) return prev;
          const next = patchBootstrapMembers(prev, updater);
          void globalMutate(BOOTSTRAP_KEY, next, { revalidate: false, populateCache: true });
          return next;
        },
        { revalidate: false, populateCache: true },
      );
    },
    [mutate],
  );

  const refresh = useCallback(async () => {
    await mutate(undefined, { revalidate: true });
  }, [mutate]);

  const refreshMembers = useCallback(async () => {
    try {
      const fresh = await apiFetch<BootstrapData>(BOOTSTRAP_KEY);
      applyBootstrap(fresh);
    } catch {
      await mutate(undefined, { revalidate: true });
    }
    void globalMutate(CONFIG_KEY, undefined, { revalidate: true });
  }, [mutate, applyBootstrap]);

  const addMemberToCache = useCallback(
    (member: MemberInfo) => {
      patchMembersCache((members) => {
        if (members.some((m) => m.id === member.id)) {
          return members.map((m) => (m.id === member.id ? { ...m, ...member } : m));
        }
        return [...members, { ...member, isActive: member.isActive ?? true }];
      });
    },
    [patchMembersCache],
  );

  const removeMemberFromCache = useCallback(
    (memberId: string) => {
      patchMembersCache((members) => members.filter((m) => m.id !== memberId));
    },
    [patchMembersCache],
  );

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
    purgeVolatileSwrStorage();
  }, []);

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
        refreshMembers,
        addMemberToCache,
        removeMemberFromCache,
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
