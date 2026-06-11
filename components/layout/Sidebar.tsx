'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useApp } from '@/components/providers/AppProvider';
import { MemberLoginModal } from '@/components/auth/MemberLoginModal';
import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { href: '/bills', label: 'Monthly Bills', icon: 'bills' },
  { href: '/meals', label: 'Meal Management', icon: 'meals' },
  { href: '/expenses', label: 'Expenses', icon: 'expenses' },
  { href: '/settings', label: 'Configuration', icon: 'settings' },
];

function NavIcon({ type }: { type: string }) {
  if (type === 'grid') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
  if (type === 'bills') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
  if (type === 'meals') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  );
  if (type === 'expenses') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { apartment, currentMember, refresh, setCurrentMember } = useApp();
  const [loginOpen, setLoginOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/member/logout', { method: 'POST' });
    setCurrentMember(null);
    await refresh();
  };

  return (
    <>
      <div className={`sidebar-backdrop${open ? ' open' : ''}`} onClick={onClose} />
      <aside className={`sidebar${open ? ' open' : ''}`} id="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__logo">
            <Image className="sidebar__logo-img" src="/assets/images/Logo.png" alt="LocalHost logo" width={44} height={44} />
          </div>
          <div>
            <div className="sidebar__title">{apartment?.name || 'LocalHost'}</div>
            <div className="sidebar__tagline">Bill Splitter</div>
          </div>
        </div>
        <nav className="sidebar__nav">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link nav-link--link${pathname === item.href ? ' active' : ''}`}
              onClick={onClose}
            >
              <NavIcon type={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar__footer">
          <div className="sidebar-user">
            {currentMember ? (
              <div className="sidebar-user__btn sidebar-user__btn--logged">
                <Avatar name={currentMember.name} photoUrl={currentMember.photoUrl} size="sm" />
                <div className="sidebar-user__info">
                  <div className="sidebar-user__name">{currentMember.name}</div>
                  <div className="sidebar-user__role">
                    {currentMember.isAdmin ? 'Admin' : currentMember.isBillManager ? 'Bill Manager' : 'Member'}
                  </div>
                </div>
              </div>
            ) : (
              <button type="button" className="sidebar-user__btn" onClick={() => setLoginOpen(true)}>
                <span className="sidebar-user__signin-label">Sign in to edit</span>
              </button>
            )}
            {currentMember && (
              <button type="button" className="sidebar-user__logout" onClick={handleLogout}>Sign out</button>
            )}
            {apartment?.registrationId && (
              <div className="sidebar__meta" style={{ marginTop: 8 }}>{apartment.registrationId}</div>
            )}
          </div>
        </div>
      </aside>
      <MemberLoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
