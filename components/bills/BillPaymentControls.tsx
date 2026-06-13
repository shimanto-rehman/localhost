'use client';

import { useState } from 'react';
import { fmt } from '@/lib/utils';
import { useToast } from '@/components/providers/ToastProvider';

export type PaymentRow = {
  memberId: string;
  status: string;
  amountDue: number;
  amountPaid: number;
  balance: number;
};

export function BillPaymentBadge({ payment }: { payment?: PaymentRow }) {
  if (!payment) return <span className="pay-badge pay-badge--due">Unpaid</span>;
  const cls =
    payment.status === 'paid'
      ? 'pay-badge pay-badge--paid'
      : payment.status === 'partial'
        ? 'pay-badge pay-badge--partial'
        : 'pay-badge pay-badge--due';

  const label =
    payment.status === 'paid'
      ? 'Paid ✓'
      : payment.status === 'partial'
        ? `Partial · ${fmt(payment.balance).slice(1)} due`
        : 'Unpaid';

  return <span className={cls}>{label}</span>;
}

export function BillPaymentControls({
  monthKey,
  memberId,
  total,
  payment,
  canEdit,
  onUpdated,
}: {
  monthKey: string;
  memberId: string;
  total: number;
  payment?: PaymentRow;
  canEdit: boolean;
  onUpdated: () => void;
}) {
  const { toast } = useToast();
  const [partialAmount, setPartialAmount] = useState('');
  const [showPartial, setShowPartial] = useState(false);
  const [saving, setSaving] = useState(false);

  const updatePayment = async (
    status: 'paid' | 'partial' | 'unpaid',
    amountPaid?: number,
  ) => {
    setSaving(true);
    const res = await fetch(`/api/bills/${monthKey}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, status, amountPaid }),
    });
    setSaving(false);
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || 'Could not update payment', 'error');
      return;
    }
    toast(status === 'paid' ? 'Marked as paid' : status === 'partial' ? 'Partial payment recorded' : 'Marked as unpaid');
    setShowPartial(false);
    setPartialAmount('');
    onUpdated();
  };

  if (!canEdit) {
    return (
      <div className="pay-controls pay-controls--readonly">
        <BillPaymentBadge payment={payment} />
      </div>
    );
  }

  return (
    <div className="pay-controls">
      <div className="pay-controls__status">
        <span className="pay-controls__label">Payment status</span>
        <BillPaymentBadge payment={payment} />
      </div>
      <div className="pay-controls__actions">
        <button
          type="button"
          className="pay-btn pay-btn--paid"
          disabled={saving || payment?.status === 'paid'}
          onClick={() => updatePayment('paid')}
        >
          Paid
        </button>
        <button
          type="button"
          className={`pay-btn pay-btn--partial${showPartial ? ' active' : ''}`}
          disabled={saving}
          onClick={() => setShowPartial((s) => !s)}
        >
          Partial
        </button>
        <button
          type="button"
          className="pay-btn pay-btn--unpaid"
          disabled={saving || payment?.status === 'unpaid'}
          onClick={() => updatePayment('unpaid')}
        >
          Unpaid
        </button>
      </div>
      {showPartial && (
        <div className="pay-controls__partial">
          <input
            className="form-input"
            type="number"
            min={1}
            max={total - 1}
            placeholder={`Amount received (max ${fmt(total).slice(1)})`}
            value={partialAmount}
            onChange={(e) => setPartialAmount(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={saving}
            onClick={() => {
              const v = parseInt(partialAmount, 10);
              if (!v || v <= 0 || v >= total) {
                toast('Enter an amount less than the total bill', 'error');
                return;
              }
              updatePayment('partial', v);
            }}
          >
            Save partial
          </button>
        </div>
      )}
    </div>
  );
}
