'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { NOTIFICATIONS_KEY } from '@/lib/api/cache-keys';
import { useApp } from '@/components/providers/AppProvider';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

const TYPE_ICONS: Record<string, string> = {
  bill_paid: '✓',
  bill_partial: '◐',
  bill_due_carried: '↩',
  electricity_reminder: '⚡',
  bill_locked: '🔒',
  system: 'ℹ',
  bug_report: '🐛',
};

export function NotificationBell() {
  const { currentMember } = useApp();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data, mutate } = useSWR<{
    notifications: NotificationItem[];
    unreadCount: number;
  }>(currentMember ? NOTIFICATIONS_KEY : null, { refreshInterval: 60_000 });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const markRead = useCallback(async (id: string) => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    mutate();
  }, [mutate]);

  const markAllRead = useCallback(async () => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    });
    mutate();
  }, [mutate]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (!currentMember) return null;

  return (
    <div className="notif-bell" ref={panelRef}>
      <button
        type="button"
        className="notif-bell__btn"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notif-bell__badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-panel__head">
            <span className="notif-panel__title">Notifications</span>
            {unreadCount > 0 && (
              <button type="button" className="notif-panel__mark-all" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notif-panel__list">
            {notifications.length === 0 ? (
              <div className="notif-panel__empty">No notifications yet</div>
            ) : (
              notifications.map((n) => {
                const content = (
                  <>
                    <span className="notif-item__icon" aria-hidden>
                      {TYPE_ICONS[n.type] || '•'}
                    </span>
                    <div className="notif-item__body">
                      <div className="notif-item__title">{n.title}</div>
                      <div className="notif-item__text">{n.body}</div>
                      <time className="notif-item__time">
                        {new Date(n.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>
                    {!n.readAt && <span className="notif-item__dot" aria-hidden />}
                  </>
                );

                if (n.href) {
                  return (
                    <Link
                      key={n.id}
                      href={n.href}
                      className={`notif-item${!n.readAt ? ' notif-item--unread' : ''}`}
                      onClick={() => { if (!n.readAt) markRead(n.id); setOpen(false); }}
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <button
                    key={n.id}
                    type="button"
                    className={`notif-item${!n.readAt ? ' notif-item--unread' : ''}`}
                    onClick={() => { if (!n.readAt) markRead(n.id); }}
                  >
                    {content}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
