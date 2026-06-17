'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Ambient } from '@/components/layout/Ambient';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { Preloader } from '@/components/layout/Preloader';
import { AppProvider, useApp } from '@/components/providers/AppProvider';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/bills': 'Monthly Bills',
  '/meals': 'Meal Management',
  '/expenses': 'Expenses',
  '/import': 'Monthly Import',
  '/settings': 'Configuration',
  '/profile': 'My Profile',
};

function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { apartment, loading, error, refresh } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const title = PAGE_TITLES[pathname] || 'LocalHost';

  useEffect(() => {
    if (!loading && !apartment && !error) router.replace('/login');
  }, [loading, apartment, error, router]);

  if (error && !apartment) {
    return (
      <div className="app-load-error">
        <p className="app-load-error__title">Could not load your apartment</p>
        <p className="app-load-error__msg">{error.message}</p>
        <button type="button" className="btn btn-primary" onClick={() => refresh()}>
          Try again
        </button>
      </div>
    );
  }

  if (!apartment) {
    if (loading) return <Preloader />;
    return null;
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
