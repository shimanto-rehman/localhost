'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/providers/ToastProvider';
import { useApp } from '@/components/providers/AppProvider';
import { ModalBackdrop } from '@/components/ui/ModalBackdrop';
import type { PaymentMethod } from '@/components/settings/MemberPaymentMethodsEditor';

export function PaymentMethodsModal({
  memberId,
  memberName,
  open,
  onClose,
}: {
  memberId: string;
  memberName?: string;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { members } = useApp();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);

  const displayName = memberName ?? members.find((m) => m.id === memberId)?.name;

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/members/${memberId}/payment-methods`)
      .then((r) => (r.ok ? r.json() : { methods: [] }))
      .then((d) => setMethods(d.methods || []))
      .finally(() => setLoading(false));
  }, [open, memberId]);

  if (!open) return null;

  const banks = methods.filter((m) => m.type === 'bank');
  const wallets = methods.filter((m) => m.type === 'mfs');

  const copy = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast(`${label} copied`);
  };

  return (
    <ModalBackdrop open={open} onClose={onClose}>
      <div className="modal modal--payment" role="dialog" aria-labelledby="payment-modal-title">
        <header className="modal__header">
          <div className="modal__header-text">
            <h2 id="payment-modal-title" className="modal__title">Send payment to</h2>
            <p className="modal__sub">
              {displayName ? <strong>{displayName}</strong> : 'Bill Manager'}
              <span className="modal__sub-dot">·</span>
              Bank &amp; MFS wallet details
            </p>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="modal__body">
          {loading ? (
            <p className="modal__loading">Loading payment details…</p>
          ) : methods.length === 0 ? (
            <p className="pay-methods-empty">
              No payment accounts configured yet. Ask the admin to add them in Configuration → Members.
            </p>
          ) : (
            <div className="pay-methods-view">
              {banks.length > 0 && (
                <section className="pay-methods-view__section">
                  <h3 className="pay-methods-view__heading">
                    <span className="pay-methods-view__badge pay-methods-view__badge--bank">Bank</span>
                    Bank accounts
                  </h3>
                  <div className="pay-methods-view__cards">
                    {banks.map((m) => (
                      <article key={m.id} className="pay-method-card pay-method-card--bank">
                        <div className="pay-method-card__top">
                          <span className="pay-method-card__name">{m.bankName}</span>
                          {m.branchName && <span className="pay-method-card__sub">{m.branchName}</span>}
                        </div>
                        <div className="pay-method-card__rows">
                          <div className="pay-method-card__row">
                            <span>Account number</span>
                            <strong>{m.accountNumber}</strong>
                          </div>
                          {m.routingNumber && (
                            <div className="pay-method-card__row">
                              <span>Routing number</span>
                              <strong>{m.routingNumber}</strong>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm pay-method-card__copy"
                          onClick={() => copy(m.accountNumber, 'Account number')}
                        >
                          Copy account number
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {wallets.length > 0 && (
                <section className="pay-methods-view__section">
                  <h3 className="pay-methods-view__heading">
                    <span className="pay-methods-view__badge pay-methods-view__badge--mfs">MFS</span>
                    Mobile wallets
                  </h3>
                  <div className="pay-methods-view__cards">
                    {wallets.map((m) => (
                      <article key={m.id} className="pay-method-card pay-method-card--mfs">
                        <div className="pay-method-card__top">
                          <span className="pay-method-card__name">{m.walletType}</span>
                          <span className="pay-method-card__sub">Mobile financial service</span>
                        </div>
                        <div className="pay-method-card__rows">
                          <div className="pay-method-card__row">
                            <span>Wallet number</span>
                            <strong>{m.accountNumber}</strong>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm pay-method-card__copy"
                          onClick={() => copy(m.accountNumber, 'Wallet number')}
                        >
                          Copy wallet number
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        <footer className="modal__footer">
          <button className="btn btn-primary" type="button" onClick={onClose}>Done</button>
        </footer>
      </div>
    </ModalBackdrop>
  );
}
