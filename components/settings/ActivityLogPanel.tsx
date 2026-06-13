'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { AUDIT_EVENTS_KEY } from '@/lib/api/cache-keys';
import { Avatar } from '@/components/ui/Avatar';
import { BugReportModal } from '@/components/settings/BugReportModal';

type AuditEvent = {
  id: string;
  action: string;
  actionLabel: string;
  meta: Record<string, unknown>;
  createdAt: string;
  actor: { id: string; name: string; photoUrl?: string | null } | null;
  isSystem: boolean;
  isError: boolean;
};

export function ActivityLogPanel() {
  const [bugOpen, setBugOpen] = useState(false);
  const { data, isLoading } = useSWR<{ events: AuditEvent[] }>(AUDIT_EVENTS_KEY);
  const events = data?.events ?? [];

  return (
    <div className="activity-log">
      <div className="activity-log__toolbar">
        <p className="activity-log__intro">
          See who changed bills, payments, settings, and more. System actions appear when no member is logged in.
        </p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBugOpen(true)}>
          Report a bug
        </button>
      </div>

      <div className="activity-log__list">
        {isLoading ? (
          <div className="activity-log__empty">Loading activity…</div>
        ) : events.length === 0 ? (
          <div className="activity-log__empty">No activity recorded yet.</div>
        ) : (
          events.map((e, i) => (
            <article
              key={e.id}
              className={`activity-item${e.isError ? ' activity-item--error' : ''}`}
            >
              <div className="activity-item__avatar">
                {e.actor ? (
                  <Avatar name={e.actor.name} photoUrl={e.actor.photoUrl} index={i} size="sm" />
                ) : (
                  <span className="activity-item__system-icon" aria-hidden>⚙</span>
                )}
              </div>
              <div className="activity-item__content">
                <div className="activity-item__head">
                  <span className="activity-item__action">{e.actionLabel}</span>
                  <time className="activity-item__time">
                    {new Date(e.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </div>
                <div className="activity-item__who">
                  {e.actor ? e.actor.name : 'System'}
                </div>
                {e.meta && Object.keys(e.meta).length > 0 && (
                  <div className="activity-item__meta">{formatMeta(e.meta)}</div>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      <BugReportModal open={bugOpen} onClose={() => setBugOpen(false)} />
    </div>
  );
}

function formatMeta(meta: Record<string, unknown>): string {
  const parts: string[] = [];
  if (meta.monthKey) parts.push(`Month: ${meta.monthKey}`);
  if (meta.status) parts.push(`Status: ${meta.status}`);
  if (meta.amountPaid != null) parts.push(`Paid: ৳${Number(meta.amountPaid).toLocaleString('en-BD')}`);
  if (meta.amountDue != null) parts.push(`Due: ৳${Number(meta.amountDue).toLocaleString('en-BD')}`);
  if (meta.amount != null) parts.push(`Amount: ৳${Number(meta.amount).toLocaleString('en-BD')}`);
  if (meta.memberName) parts.push(`Member: ${meta.memberName}`);
  if (meta.electricity != null) parts.push(`Electricity: ৳${meta.electricity}`);
  if (meta.preview) parts.push(String(meta.preview));
  if (meta.pageUrl) parts.push(String(meta.pageUrl));
  return parts.join(' · ');
}
