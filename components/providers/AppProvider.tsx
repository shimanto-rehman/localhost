'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';

export interface MemberInfo {
  id: string;
  name: string;
  photoUrl?: string | null;
  isAdmin?: boolean;
  isBillManager?: boolean;
  isActive?: boolean;
  email?: string | null;
  phone?: string | null;
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

interface AppContextValue {
  apartment: ApartmentInfo | null;
  members: MemberInfo[];
  currentMember: MemberInfo | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setCurrentMember: (m: MemberInfo | null) => void;
}

const AppContext = createContext<AppContextValue>({
  apartment: null,
  members: [],
  currentMember: null,
  loading: true,
  refresh: async () => {},
  setCurrentMember: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [apartment, setApartment] = useState<ApartmentInfo | null>(null);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [currentMember, setCurrentMember] = useState<MemberInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [aptRes, membersRes, verifyRes] = await Promise.all([
        fetch('/api/auth/apartment/info'),
        fetch('/api/members'),
        fetch('/api/auth/member/verify'),
      ]);

      if (aptRes.ok) {
        const apt = await aptRes.json();
        setApartment(apt);
      }

      if (membersRes.ok) {
        const m = await membersRes.json();
        setMembers(m);
      }

      if (verifyRes.ok) {
        const v = await verifyRes.json();
        setCurrentMember(v.member);
      } else {
        setCurrentMember(null);
      }
    } catch {
      /* offline */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AppContext.Provider
      value={{ apartment, members, currentMember, loading, refresh, setCurrentMember }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
