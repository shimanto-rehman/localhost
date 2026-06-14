'use client';

import { useCallback, useEffect, useState } from 'react';
import { MFS_WALLET_TYPES } from '@/lib/constants';
import { useToast } from '@/components/providers/ToastProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export type PaymentMethod = {
  id: string;
  type: 'bank' | 'mfs';
  accountNumber: string;
  bankName?: string | null;
  branchName?: string | null;
  routingNumber?: string | null;
  walletType?: string | null;
};

type DraftBank = {
  bankName: string;
  accountNumber: string;
  branchName: string;
  routingNumber: string;
};

type DraftMfs = {
  walletType: string;
  accountNumber: string;
};

const emptyBank = (): DraftBank => ({
  bankName: '',
  accountNumber: '',
  branchName: '',
  routingNumber: '',
});

const emptyMfs = (): DraftMfs => ({
  walletType: MFS_WALLET_TYPES[0],
  accountNumber: '',
});

export function MemberPaymentMethodsEditor({
  memberId,
  memberName,
  isAdmin,
}: {
  memberId: string;
  memberName: string;
  isAdmin: boolean;
}) {
  const { toast } = useToast();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<'bank' | 'mfs' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bankDraft, setBankDraft] = useState<DraftBank>(emptyBank());
  const [mfsDraft, setMfsDraft] = useState<DraftMfs>(emptyMfs());
  const [saving, setSaving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<PaymentMethod | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/members/${memberId}/payment-methods`);
      if (res.ok) {
        const data = await res.json();
        setMethods(data.methods || []);
      }
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => { load(); }, [load]);

  const resetForms = () => {
    setAdding(null);
    setEditingId(null);
    setBankDraft(emptyBank());
    setMfsDraft(emptyMfs());
  };

  const apiErrorToast = (d: { error?: string; fields?: Record<string, string> }, fallback: string) => {
    const fieldMsg = d.fields ? Object.values(d.fields).filter(Boolean).join(' · ') : '';
    toast(fieldMsg || d.error || fallback, 'error');
  };

  const submitBank = async () => {
    const payload = {
      type: 'bank' as const,
      bankName: bankDraft.bankName.trim(),
      accountNumber: bankDraft.accountNumber.trim(),
      branchName: bankDraft.branchName.trim(),
      routingNumber: bankDraft.routingNumber.trim(),
    };
    setSaving(true);
    try {
      const url = editingId
        ? `/api/members/${memberId}/payment-methods/${editingId}`
        : `/api/members/${memberId}/payment-methods`;
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        apiErrorToast(d, 'Could not save bank account');
        return;
      }
      toast(editingId ? 'Bank account updated' : 'Bank account added');
      resetForms();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const submitMfs = async () => {
    const payload = {
      type: 'mfs' as const,
      walletType: mfsDraft.walletType,
      accountNumber: mfsDraft.accountNumber.trim(),
    };
    setSaving(true);
    try {
      const url = editingId
        ? `/api/members/${memberId}/payment-methods/${editingId}`
        : `/api/members/${memberId}/payment-methods`;
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        apiErrorToast(d, 'Could not save wallet');
        return;
      }
      toast(editingId ? 'Wallet updated' : 'Wallet added');
      resetForms();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (m: PaymentMethod) => {
    setEditingId(m.id);
    setAdding(m.type);
    if (m.type === 'bank') {
      setBankDraft({
        bankName: m.bankName || '',
        accountNumber: m.accountNumber,
        branchName: m.branchName || '',
        routingNumber: m.routingNumber || '',
      });
    } else {
      setMfsDraft({
        walletType: m.walletType || MFS_WALLET_TYPES[0],
        accountNumber: m.accountNumber,
      });
    }
  };

  const confirmRemovePaymentMethod = async () => {
    if (!removeTarget) return;
    setRemoveLoading(true);
    try {
      const res = await fetch(`/api/members/${memberId}/payment-methods/${removeTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        toast('Could not remove', 'error');
        return;
      }
      toast('Payment method removed');
      setRemoveTarget(null);
      await load();
    } finally {
      setRemoveLoading(false);
    }
  };

  const renderBankForm = () => (
    <div className="pay-method-form pay-method-form--bank">
      <div className="pay-method-form__grid">
        <label className="pay-method-form__field">
          <span className="form-label">Bank name</span>
          <input className="form-input" value={bankDraft.bankName} onChange={(e) => setBankDraft((p) => ({ ...p, bankName: e.target.value }))} placeholder="e.g. BRAC Bank" />
        </label>
        <label className="pay-method-form__field">
          <span className="form-label">Account number</span>
          <input className="form-input" value={bankDraft.accountNumber} onChange={(e) => setBankDraft((p) => ({ ...p, accountNumber: e.target.value }))} placeholder="Digits only" />
        </label>
        <label className="pay-method-form__field">
          <span className="form-label">Branch name <span className="form-label-optional">optional</span></span>
          <input className="form-input" value={bankDraft.branchName} onChange={(e) => setBankDraft((p) => ({ ...p, branchName: e.target.value }))} placeholder="e.g. Nikunja" />
        </label>
        <label className="pay-method-form__field">
          <span className="form-label">Routing number <span className="form-label-optional">optional, 9 digits</span></span>
          <input className="form-input" value={bankDraft.routingNumber} onChange={(e) => setBankDraft((p) => ({ ...p, routingNumber: e.target.value }))} placeholder="9 digits" />
        </label>
      </div>
      <div className="pay-method-form__actions">
        <button className="btn btn-primary btn-sm" type="button" disabled={saving} onClick={submitBank}>
          {saving ? 'Saving…' : editingId ? 'Update bank' : 'Save bank'}
        </button>
        <button className="btn btn-ghost btn-sm" type="button" onClick={resetForms}>Cancel</button>
      </div>
    </div>
  );

  const renderMfsForm = () => (
    <div className="pay-method-form pay-method-form--mfs">
      <div className="pay-method-form__fields">
        <label className="pay-method-form__field">
          <span className="form-label">Wallet</span>
          <select className="form-input" value={mfsDraft.walletType} onChange={(e) => setMfsDraft((p) => ({ ...p, walletType: e.target.value }))}>
            {MFS_WALLET_TYPES.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </label>
        <label className="pay-method-form__field">
          <span className="form-label">Account number</span>
          <input className="form-input" value={mfsDraft.accountNumber} onChange={(e) => setMfsDraft((p) => ({ ...p, accountNumber: e.target.value }))} placeholder="01XXXXXXXXX" />
        </label>
      </div>
      <div className="pay-method-form__actions">
        <button className="btn btn-primary btn-sm" type="button" disabled={saving} onClick={submitMfs}>
          {saving ? 'Saving…' : editingId ? 'Update wallet' : 'Save wallet'}
        </button>
        <button className="btn btn-ghost btn-sm" type="button" onClick={resetForms}>Cancel</button>
      </div>
    </div>
  );

  return (
    <section className="pay-methods-editor" aria-label={`Payment methods for ${memberName}`}>
      <header className="pay-methods-editor__head">
        <div>
          <h4 className="pay-methods-editor__title">Payment receive accounts</h4>
          <p className="pay-methods-editor__hint">Members use these to send bill payments to the Bill Manager.</p>
        </div>
      </header>

      {loading ? (
        <p className="form-hint">Loading payment methods…</p>
      ) : (
        <>
          {methods.length > 0 && (
            <ul className="pay-methods-list">
              {methods.map((m) => (
                <li key={m.id} className={`pay-method-chip pay-method-chip--${m.type}`}>
                  <div className="pay-method-chip__icon" aria-hidden>
                    {m.type === 'bank' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l8-4v14M19 21V11l-6-3" /></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12" y2="18" /></svg>
                    )}
                  </div>
                  <div className="pay-method-chip__body">
                    <span className="pay-method-chip__label">
                      {m.type === 'bank' ? m.bankName : m.walletType}
                    </span>
                    <span className="pay-method-chip__acct">{m.accountNumber}</span>
                    {m.type === 'bank' && m.branchName && (
                      <span className="pay-method-chip__meta">{m.branchName}</span>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="pay-method-chip__actions">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEdit(m)}>Edit</button>
                      <button type="button" className="pay-method-chip__remove" onClick={() => setRemoveTarget(m)} aria-label="Remove">×</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {isAdmin && !adding && (
            <div className="pay-method-picker">
              <button type="button" className="pay-method-picker__btn pay-method-picker__btn--bank" onClick={() => { resetForms(); setAdding('bank'); }}>
                <span>+ Bank account</span>
              </button>
              <button type="button" className="pay-method-picker__btn pay-method-picker__btn--mfs" onClick={() => { resetForms(); setAdding('mfs'); }}>
                <span>+ MFS wallet</span>
              </button>
            </div>
          )}

          {isAdmin && adding === 'bank' && renderBankForm()}
          {isAdmin && adding === 'mfs' && renderMfsForm()}
        </>
      )}
      <ConfirmDialog
        open={Boolean(removeTarget)}
        onClose={() => { if (!removeLoading) setRemoveTarget(null); }}
        onConfirm={confirmRemovePaymentMethod}
        title="Remove payment method?"
        description={
          removeTarget
            ? `This ${removeTarget.type === 'bank' ? 'bank account' : 'wallet'} (${removeTarget.type === 'bank' ? removeTarget.bankName : removeTarget.walletType} · ${removeTarget.accountNumber}) will be removed from ${memberName}'s receive accounts.`
            : ''
        }
        confirmLabel="Remove"
        cancelLabel="Keep"
        variant="danger"
        loading={removeLoading}
      />
    </section>
  );
}
