'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/providers/ToastProvider';

export function BankCardModal({
  memberId,
  open,
  onClose,
}: {
  memberId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [bank, setBank] = useState<Record<string, string | null> | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/members/${memberId}/bank-account`)
      .then((r) => r.ok ? r.json() : null)
      .then(setBank);
  }, [open, memberId]);

  if (!open) return null;

  const copyAccount = () => {
    if (bank?.accountNumber) {
      navigator.clipboard.writeText(bank.accountNumber);
      toast('Account number copied');
    }
  };

  return (
    <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal__title">Payment Reference</div>
        <div className="modal__sub">Bill Manager bank account details</div>
        {bank ? (
          <div className="bank-card">
            <div className="bank-card__row"><span>Account Number</span><strong>{bank.accountNumber}</strong></div>
            <div className="bank-card__row"><span>Bank</span><strong>{bank.bankName}</strong></div>
            {bank.branchName && <div className="bank-card__row"><span>Branch</span><strong>{bank.branchName}</strong></div>}
            {bank.routingNumber && <div className="bank-card__row"><span>Routing</span><strong>{bank.routingNumber}</strong></div>}
            {bank.accountType && <div className="bank-card__row"><span>Type</span><strong>{bank.accountType}</strong></div>}
            {bank.mobileBankingNumber && (
              <div className="bank-card__row"><span>{bank.mobileBankingType || 'Mobile'}</span><strong>{bank.mobileBankingNumber}</strong></div>
            )}
            <button className="btn btn-primary btn-sm" type="button" onClick={copyAccount} style={{ marginTop: 16 }}>Copy Account Number</button>
          </div>
        ) : (
          <p className="form-hint">No bank account on file.</p>
        )}
        <div className="modal__actions">
          <button className="btn btn-ghost btn-sm" type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
