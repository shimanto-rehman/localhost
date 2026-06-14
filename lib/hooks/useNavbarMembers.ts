'use client';

import useSWR from 'swr';
import { BOOTSTRAP_KEY } from '@/lib/api/cache-keys';
import type { BootstrapData, MemberInfo } from '@/lib/member-bootstrap-cache';

/** Navbar avatar stack — subscribes directly to bootstrap so member add/remove updates instantly. */
export function useNavbarMembers(): MemberInfo[] {
  const { data } = useSWR<BootstrapData>(BOOTSTRAP_KEY, {
    keepPreviousData: false,
  });
  return (data?.members ?? []).filter((m) => m.isActive !== false).slice(0, 5);
}
