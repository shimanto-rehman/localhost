'use client';

import { useState } from 'react';
import { ModalBackdrop } from '@/components/ui/ModalBackdrop';
import { useToast } from '@/components/providers/ToastProvider';

export function BugReportModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (description.trim().length < 10) {
      toast('Please describe the issue in at least 10 characters', 'error');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || 'Could not send report', 'error');
        return;
      }
      toast(data.message || 'Bug report sent. Thank you!', 'success');
      setDescription('');
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <ModalBackdrop open={open} onClose={onClose}>
      <div className="bug-modal" role="dialog" aria-labelledby="bug-modal-title">
        <header className="bug-modal__head">
          <h2 id="bug-modal-title">Report a bug</h2>
          <button type="button" className="bug-modal__close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>
        <p className="bug-modal__hint">
          Describe what went wrong, what you expected, and steps to reproduce. Your report is emailed to the developer.
        </p>
        <textarea
          className="form-input bug-modal__input"
          rows={6}
          placeholder="e.g. On Bills page, clicking Lock shows an error after entering electricity…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
        />
        <div className="bug-modal__actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={sending}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={sending}>
            {sending ? 'Sending…' : 'Send report'}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}
