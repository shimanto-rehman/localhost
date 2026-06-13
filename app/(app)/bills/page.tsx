'use client';

import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import { fmt, monthKey, monthLabel } from '@/lib/utils';
import { MONTH_NAMES } from '@/lib/constants';
import { Avatar } from '@/components/ui/Avatar';
import { useApp } from '@/components/providers/AppProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { billCalcKey, billKey, billPaymentsKey } from '@/lib/api/cache-keys';
import { PaymentMethodsModal } from '@/components/ui/PaymentMethodsModal';
import { BillPaymentControls, BillPaymentBadge, type PaymentRow } from '@/components/bills/BillPaymentControls';
import { memberHasPerm } from '@/lib/client-permissions';

const BILL_LABELS: Record<string, string> = {
  fixedBucket: '🏠 Rent + Gas + Water + Service',
  electricity: '⚡ Electricity',
  meals: '🍽 Meals',
};

type AdjItem = { id: string; type: 'lend' | 'borrow'; label: string; amount: number };
type CalcResult = {
  id: string; name: string; photoUrl?: string | null;
  breakdown: {
    fixedBucket: number; electricity: number; meals: number;
    optional: Record<string, number>;
    variable: Record<string, number>;
  };
  baseTotal: number;
  adjDelta: number;
  total: number;
  adjustments: AdjItem[];
};
type CalcData = {
  results: CalcResult[];
  fixedBucket: number; electricity: number | null;
  houseRentTotal: number; mealTotal: number;
  collectedTotal: number; gap: number; actualBill: number;
};

export default function BillsPage() {
  const { members, currentMember, apartment } = useApp();
  const { toast } = useToast();
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [electricity, setElectricity] = useState('');
  const [adjTypes, setAdjTypes] = useState<Record<string, 'lend' | 'borrow'>>({});
  const [adjLabels, setAdjLabels] = useState<Record<string, string>>({});
  const [adjAmounts, setAdjAmounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);

  const mk = monthKey(month);
  const { data: billData, mutate: mutateBill } = useSWR<Record<string, unknown>>(billKey(mk));
  const bill = billData ?? null;
  const isLocked = Boolean(bill?.isLocked);
  const { data: calcData, mutate: mutateCalc } = useSWR<{
    calculation?: CalcData;
    optionalCostDetails?: {
      id: string; name: string; amount: number;
      optedInMemberIds: string[]; optedInCount: number; perHead: number;
    }[];
  }>(billCalcKey(mk));
  const { data: payData, mutate: mutatePayments } = useSWR<{ payments: PaymentRow[] }>(
    isLocked ? billPaymentsKey(mk) : null,
  );

  const calc = calcData?.calculation ?? null;
  const optionalDetails = calcData?.optionalCostDetails || [];
  const canSubmit = memberHasPerm(currentMember, 'lock_bills');
  const canAdjust = memberHasPerm(currentMember, 'bill_adjustments');
  const canMarkPayments = memberHasPerm(currentMember, 'lock_bills');
  const canViewPaymentSummary = memberHasPerm(currentMember, 'view_payment_summary');
  const billManagerId = apartment?.billManagerId;
  const billManager = billManagerId ? members.find((m) => m.id === billManagerId) : undefined;
  const paymentsByMember = new Map((payData?.payments ?? []).map((p) => [p.memberId, p]));

  const load = useCallback(async () => {
    await Promise.all([mutateBill(), mutateCalc(), mutatePayments()]);
  }, [mutateBill, mutateCalc, mutatePayments]);

  useEffect(() => {
    if (billData?.electricity != null) setElectricity(String(billData.electricity));
    else setElectricity('');
  }, [billData]);

  const shiftMonth = (delta: number) =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const handleLock = async () => {
    if (!canSubmit) { toast('Admin or Bill Manager sign-in required', 'error'); return; }
    const v = parseFloat(electricity);
    if (!v || v <= 0) { toast('Enter a valid electricity amount', 'error'); return; }
    setSaving(true);
    const res = await fetch(`/api/bills/${mk}/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ electricity: v }),
    });
    setSaving(false);
    const data = await res.json();
    if (!res.ok) { toast(data.error || 'Could not save', 'error'); return; }
    toast(`Electricity ${fmt(v)} locked for ${monthLabel(month)}`);
    load();
  };

  const addAdjustment = async (memberId: string) => {
    if (!canAdjust) { toast('Bill Manager access required', 'error'); return; }
    const label = adjLabels[memberId]?.trim();
    const amount = parseFloat(adjAmounts[memberId] || '');
    const type = adjTypes[memberId] || 'lend';
    if (!label) { toast('Enter a description', 'error'); return; }
    if (!amount || amount <= 0) { toast('Enter a valid amount', 'error'); return; }
    const res = await fetch(`/api/bills/${mk}/adjustments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, type, label, amount }),
    });
    if (!res.ok) { toast('Could not add adjustment', 'error'); return; }
    toast('Adjustment added');
    setAdjLabels((p) => ({ ...p, [memberId]: '' }));
    setAdjAmounts((p) => ({ ...p, [memberId]: '' }));
    load();
  };

  const removeAdjustment = async (adjId: string) => {
    const res = await fetch(`/api/bills/${mk}/adjustments/${adjId}`, { method: 'DELETE' });
    if (!res.ok) { toast('Could not delete', 'error'); return; }
    toast('Adjustment deleted');
    load();
  };

  const results = calc?.results || [];
  const lockedDate = bill?.lockedAt || bill?.updatedAt || bill?.createdAt;

  return (
    <section className="page active">
      <div className="month-panel">
        <div className="month-panel__header">
          <button className="month-nav-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month" type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="month-panel__header-inner">
            <div className="month-panel__label">{MONTH_NAMES[month.getMonth()]}</div>
            <div className="month-panel__year">{month.getFullYear()} · Billing Period</div>
          </div>
          <button className="month-nav-btn" onClick={() => shiftMonth(1)} aria-label="Next month" type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <div className="month-panel__body">
          {/* ── Unlocked: electricity gate ── */}
          {!isLocked && (
            <div className="elec-gate">
              <div className="elec-gate__icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h3>Electricity Bill Required</h3>
              <p>
                Enter the electricity amount for <strong>{monthLabel(month)}</strong>.
                Once saved, it cannot be changed without a reset.
              </p>
              <div className="elec-gate__row">
                <input
                  className="form-input"
                  type="number"
                  id="elecInput"
                  placeholder="e.g. 910"
                  min="1"
                  value={electricity}
                  onChange={(e) => setElectricity(e.target.value)}
                  disabled={!canSubmit}
                />
                <button className="btn btn-primary" type="button" onClick={handleLock} disabled={saving}>
                  {canSubmit ? (saving ? 'Saving…' : 'Submit & Lock') : 'Sign in to submit'}
                </button>
              </div>
              {!canSubmit && (
                <p className="form-hint" style={{ marginTop: 12, textAlign: 'center' }}>
                  Admin or Bill Manager sign-in required
                </p>
              )}
            </div>
          )}

          {/* ── Locked: full bill view ── */}
          {isLocked && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <span className="locked-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Locked · {lockedDate ? new Date(String(lockedDate)).toLocaleDateString() : 'Saved'}
                </span>
              </div>

              <div className="summary-pills">
                <div className="summary-pill">
                  <div className="summary-pill__label">House Rent</div>
                  <div className="summary-pill__value">{fmt(calc?.houseRentTotal || 0)}</div>
                </div>
                <div className="summary-pill">
                  <div className="summary-pill__label">Electricity</div>
                  <div className="summary-pill__value" style={{ color: 'var(--sky)' }}>{fmt(calc?.electricity || 0)}</div>
                </div>
                <div className="summary-pill">
                  <div className="summary-pill__label">Actual Bill</div>
                  <div className="summary-pill__value">{fmt(calc?.actualBill || 0)}</div>
                </div>
                <div className="summary-pill">
                  <div className="summary-pill__label">Collected</div>
                  <div className="summary-pill__value" style={{ color: 'var(--accent)' }}>{fmt(calc?.collectedTotal || 0)}</div>
                </div>
                <div className="summary-pill">
                  <div className="summary-pill__label">Rounding Gap</div>
                  <div className="summary-pill__value" style={{ color: 'var(--amber)' }}>+{fmt(calc?.gap || 0)}</div>
                </div>
              </div>

              {/* ── Member cards ── */}
              {results.length > 0 && (
                <div className="grid-3" id="monthMemberCards">
                  {results.map((r, i) => (
                    <div key={r.id} className="member-card" style={{ animationDelay: `${i * 0.08}s` }}>
                      <div className="member-card__head">
                        <Avatar name={r.name} photoUrl={r.photoUrl} index={i} />
                        <div>
                          <div className="member-card__name">
                            {r.name}
                            {billManagerId === r.id && <span className="manager-badge">Bill Manager</span>}
                          </div>
                          <div className="member-card__total" style={{ fontSize: 26 }}>{fmt(r.total)}</div>
                        </div>
                      </div>
                      {/* Fixed cost items */}
                      {(['fixedBucket', 'electricity', 'meals'] as const).map((k) => {
                        const v = r.breakdown[k];
                        if (!v && v !== 0) return null;
                        if (k === 'meals' && v === 0) return null;
                        return (
                          <div key={k} className="bill-row">
                            <span className="bill-row__label">{BILL_LABELS[k]}</span>
                            <span className="bill-row__value">{fmt(v)}</span>
                          </div>
                        );
                      })}
                      {/* Optional costs (per-member opt-in) */}
                      {optionalDetails.map((oc) => {
                        const v = r.breakdown.optional?.[oc.id] || 0;
                        const optedIn = oc.optedInMemberIds.includes(r.id);
                        return (
                          <div
                            key={oc.id}
                            className={`bill-row${optedIn ? '' : ' bill-row--skipped'}`}
                          >
                            <span className="bill-row__label">
                              {oc.name}
                              {optedIn ? (
                                <span className="opt-in-chip">
                                  {oc.optedInCount} members · {fmt(oc.perHead)} each
                                </span>
                              ) : (
                                <span className="opt-in-chip opt-in-chip--off">Not using</span>
                              )}
                            </span>
                            <span className="bill-row__value">{optedIn ? fmt(v) : '—'}</span>
                          </div>
                        );
                      })}
                      {r.adjustments?.map((a) => (
                        <div key={a.id} className={`bill-row bill-row--adj${a.label.startsWith('Due ·') ? ' bill-row--due-tag' : ''}`}>
                          <span className="bill-row__label">
                            {a.label.startsWith('Due ·') ? '↩ ' : ''}{a.type === 'lend' ? 'Lent' : 'Borrowed'} · {a.label}
                          </span>
                          <span className={`bill-row__value bill-row__value--${a.type === 'lend' ? 'lend' : 'borrow'}`}>
                            {a.type === 'lend' ? '+' : '−'}{fmt(Number(a.amount)).slice(1)}
                          </span>
                        </div>
                      ))}
                      <div className="bill-row" style={{ borderTop: '1px solid rgba(45,212,191,0.22)', marginTop: 8, paddingTop: 12 }}>
                        <span className="bill-row__label" style={{ fontWeight: 700, color: 'var(--text)' }}>Total Payable</span>
                        <span className="bill-row__value" style={{ color: 'var(--accent)', fontSize: 16 }}>{fmt(r.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Payment Summary ── */}
              {billManager && results.length > 0 && canViewPaymentSummary && (
                <>
                  <div className="section-head payment-section-head">
                    <div className="section-head__title">
                      Payment Summary <span>Send to <strong>{billManager.name}</strong></span>
                    </div>
                    <span className="chip chip--accent payment-manager-chip">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                      {billManager.name}
                    </span>
                  </div>

                  <div className="grid-3">
                    {results.map((r, i) => {
                      const isManagerCard = r.id === billManager.id;
                      const sendAmount = isManagerCard
                        ? results.filter((x) => x.id !== billManager.id).reduce((s, x) => s + x.total, 0)
                        : r.total;
                      const adjType = adjTypes[r.id] || 'lend';

                      return (
                        <div key={r.id} className={`payment-card${isManagerCard ? ' payment-card--manager' : ''}`} style={{ animationDelay: `${i * 0.08}s` }}>
                          <div className="payment-card__head">
                            <Avatar name={r.name} photoUrl={r.photoUrl} index={i} />
                            <div className="payment-card__meta">
                              <div className="member-card__name">{r.name}</div>
                              {isManagerCard
                                ? <span className="manager-badge">Bill Manager</span>
                                : <div className="payment-card__send">Send to <strong>{billManager.name}</strong></div>
                              }
                            </div>
                            {isManagerCard && (
                              <button
                                type="button"
                                className="payment-card__view-pay"
                                onClick={() => setPayModalOpen(true)}
                                aria-label="View Bill Manager payment details"
                                title="View bank & wallet details"
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>
                            )}
                          </div>

                            <div className="payment-card__rows">
                            <div className="bill-row">
                              <span className="bill-row__label">Bill share</span>
                              <span className="bill-row__value">{fmt(r.baseTotal)}</span>
                            </div>
                            {r.adjDelta !== 0 && (
                              <div className="bill-row bill-row--adj">
                                <span className="bill-row__label">Lend / borrow adj.</span>
                                <span className={`bill-row__value bill-row__value--${r.adjDelta > 0 ? 'lend' : 'borrow'}`}>
                                  {r.adjDelta > 0 ? '+' : '−'}{fmt(Math.abs(r.adjDelta)).slice(1)}
                                </span>
                              </div>
                            )}
                            <div className="bill-row payment-card__total-row">
                              <span className="bill-row__label">{isManagerCard ? 'Total to collect' : 'Amount to send'}</span>
                              <span className="bill-row__value payment-card__amount">{fmt(sendAmount)}</span>
                            </div>
                          </div>

                          {!isManagerCard && (
                            <BillPaymentControls
                              monthKey={mk}
                              memberId={r.id}
                              total={r.total}
                              payment={paymentsByMember.get(r.id)}
                              canEdit={canMarkPayments}
                              onUpdated={load}
                            />
                          )}

                          {!isManagerCard && (r.adjustments?.length > 0 || canAdjust) && (
                            <div className="adj-panel" data-member={r.id}>
                              <div className="adj-panel__head">
                                <span className="adj-panel__title">Lend / Borrow</span>
                                <span className="adj-panel__hint">{canAdjust ? 'Bill Manager records' : 'View only'}</span>
                              </div>

                              <div className="adj-list">
                                {r.adjustments?.length ? r.adjustments.map((a) => (
                                  <div key={a.id} className="adj-item">
                                    <div className="adj-item__info">
                                      <span className={`adj-item__type adj-item__type--${a.type}`}>
                                        {a.type === 'lend' ? 'Lent' : 'Borrowed'}
                                      </span>
                                      <span className="adj-item__label" title={a.label}>{a.label}</span>
                                    </div>
                                    <div className="adj-item__right">
                                      <span className={`adj-item__amount adj-item__amount--${a.type}`}>
                                        {a.type === 'lend' ? '+' : '−'}{fmt(Number(a.amount)).slice(1)}
                                      </span>
                                      {canAdjust && (
                                        <button
                                          className="adj-item__remove"
                                          type="button"
                                          title="Delete"
                                          onClick={() => removeAdjustment(a.id)}
                                        >
                                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )) : (
                                  <div className="adj-empty">No adjustments yet</div>
                                )}
                              </div>

                              {canAdjust && (
                                <div className="adj-form">
                                  <input
                                    className="form-input adj-input"
                                    placeholder="What was it for? e.g. Paid WiFi advance"
                                    maxLength={80}
                                    value={adjLabels[r.id] || ''}
                                    onChange={(e) => setAdjLabels((p) => ({ ...p, [r.id]: e.target.value }))}
                                  />
                                  <div className="adj-type-btns" role="group">
                                    <button
                                      type="button"
                                      className={`adj-type-btn${adjType === 'lend' ? ' active' : ''}`}
                                      data-type="lend"
                                      onClick={() => setAdjTypes((p) => ({ ...p, [r.id]: 'lend' }))}
                                    >
                                      Manager lent
                                    </button>
                                    <button
                                      type="button"
                                      className={`adj-type-btn${adjType === 'borrow' ? ' active' : ''}`}
                                      data-type="borrow"
                                      onClick={() => setAdjTypes((p) => ({ ...p, [r.id]: 'borrow' }))}
                                    >
                                      Manager borrowed
                                    </button>
                                  </div>
                                  <div className="adj-form__actions">
                                    <input
                                      className="form-input adj-amount"
                                      type="number"
                                      min="1"
                                      placeholder="Amount (৳)"
                                      value={adjAmounts[r.id] || ''}
                                      onChange={(e) => setAdjAmounts((p) => ({ ...p, [r.id]: e.target.value }))}
                                    />
                                    <button
                                      className="btn btn-primary btn-sm adj-save"
                                      type="button"
                                      onClick={() => addAdjustment(r.id)}
                                    >
                                      Add
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* ── Full data table ── */}
              {results.length > 0 && (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Expense</th>
                        <th>Total</th>
                        {results.map((r) => <th key={r.id}>{r.name}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>🏠 Rent+Gas+Water+Service</td>
                        <td style={{ fontFamily: 'var(--font-head)', fontWeight: 600, color: 'var(--accent)' }}>{fmt(calc?.fixedBucket || 0)}</td>
                        {results.map((r) => <td key={r.id} style={{ fontFamily: 'var(--font-head)', fontWeight: 600, color: 'var(--accent)' }}>{fmt(r.breakdown.fixedBucket)}</td>)}
                      </tr>
                      <tr>
                        <td>⚡ Electricity</td>
                        <td style={{ fontFamily: 'var(--font-head)', fontWeight: 600, color: 'var(--accent)' }}>{fmt(calc?.electricity || 0)}</td>
                        {results.map((r) => <td key={r.id} style={{ fontFamily: 'var(--font-head)', fontWeight: 600, color: 'var(--accent)' }}>{fmt(r.breakdown.electricity)}</td>)}
                      </tr>
                      {calc?.mealTotal != null && (
                        <tr>
                          <td>🍽 Meals</td>
                          <td style={{ fontFamily: 'var(--font-head)', fontWeight: 600, color: 'var(--accent)' }}>{fmt(calc.mealTotal)}</td>
                          {results.map((r) => <td key={r.id} style={{ fontFamily: 'var(--font-head)', fontWeight: 600, color: 'var(--accent)' }}>{fmt(r.breakdown.meals)}</td>)}
                        </tr>
                      )}
                      {optionalDetails.map((oc) => (
                        <tr key={oc.id}>
                          <td>
                            {oc.name}
                            <span className="opt-in-chip opt-in-chip--table">
                              {oc.optedInCount} members · {fmt(oc.perHead)}/head
                            </span>
                          </td>
                          <td style={{ fontFamily: 'var(--font-head)', fontWeight: 600, color: 'var(--accent)' }}>
                            {fmt(oc.amount)}
                          </td>
                          {results.map((r) => {
                            const optedIn = oc.optedInMemberIds.includes(r.id);
                            const amt = r.breakdown.optional?.[oc.id] || 0;
                            return (
                              <td
                                key={r.id}
                                className={optedIn ? '' : 'bill-table-cell--skipped'}
                                style={{
                                  fontFamily: 'var(--font-head)',
                                  fontWeight: optedIn ? 600 : 400,
                                  color: optedIn ? 'var(--accent)' : 'var(--text-dim)',
                                }}
                              >
                                {optedIn ? fmt(amt) : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      <tr className="total-row">
                        <td>COLLECTED</td>
                        <td>{fmt(calc?.collectedTotal || 0)}</td>
                        {results.map((r) => <td key={r.id}>{fmt(r.baseTotal)}</td>)}
                      </tr>
                      {results.some((r) => r.adjustments?.length > 0) && (
                        <>
                          <tr>
                            <td style={{ color: 'var(--text-muted)' }}>Lend / Borrow adj.</td>
                            <td>—</td>
                            {results.map((r) => (
                              <td key={r.id} style={{ color: r.adjDelta > 0 ? 'var(--amber)' : r.adjDelta < 0 ? 'var(--sky)' : 'var(--text-dim)' }}>
                                {r.adjDelta ? `${r.adjDelta > 0 ? '+' : '−'}${fmt(Math.abs(r.adjDelta)).slice(1)}` : '—'}
                              </td>
                            ))}
                          </tr>
                          <tr className="total-row">
                            <td>TOTAL PAYABLE</td>
                            <td>{fmt(results.reduce((s, r) => s + r.total, 0))}</td>
                            {results.map((r) => <td key={r.id}>{fmt(r.total)}</td>)}
                          </tr>
                        </>
                      )}
                      <tr>
                        <td style={{ color: 'var(--text-muted)' }}>Actual bill</td>
                        <td style={{ fontWeight: 600 }}>{fmt(calc?.actualBill || 0)}</td>
                        {results.map((r) => <td key={r.id} style={{ color: 'var(--text-dim)' }}>—</td>)}
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--amber)' }}>Rounding gap</td>
                        <td style={{ fontWeight: 700, color: 'var(--amber)' }}>+{fmt(calc?.gap || 0)}</td>
                        {results.map((r) => <td key={r.id} style={{ color: 'var(--text-dim)' }}>—</td>)}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {billManagerId && (
        <PaymentMethodsModal
          memberId={billManagerId}
          memberName={billManager?.name}
          open={payModalOpen}
          onClose={() => setPayModalOpen(false)}
        />
      )}
    </section>
  );
}
