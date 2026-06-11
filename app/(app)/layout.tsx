'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Ambient } from '@/components/layout/Ambient';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { AppProvider } from '@/components/providers/AppProvider';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/bills': 'Monthly Bills',
  '/meals': 'Meal Management',
  '/expenses': 'Expenses',
  '/settings': 'Configuration',
};

function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  const title = PAGE_TITLES[pathname] || 'LocalHost';

  useEffect(() => {
    fetch('/api/auth/apartment/info')
      .then((r) => {
        if (!r.ok) router.replace('/');
        else setChecked(true);
      })
      .catch(() => router.replace('/'));
  }, [router]);

  if (!checked) {
    return (
      <div className="loader-overlay" role="status">
        <div className="loader-text">Loading…</div>
      </div>
    );
  }

  return (
    <>
      <Ambient />
      <div className="app">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="main">
          <Topbar title={title} onMenuClick={() => setSidebarOpen(true)} />
          {children}
        </div>
      </div>
      <BottomNav />
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
