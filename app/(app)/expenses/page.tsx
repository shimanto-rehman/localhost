'use client';

import { useCallback, useEffect, useState } from 'react';
import { fmt, monthKey, monthLabel } from '@/lib/utils';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_COLORS, MONTH_NAMES } from '@/lib/constants';
import { Avatar } from '@/components/ui/Avatar';
import { useApp } from '@/components/providers/AppProvider';
import { useToast } from '@/components/providers/ToastProvider';

type ExpenseItem = { id: string; itemName: string; price: number; category: string };
type CalcResult = {
  id: string; name: string; photoUrl?: string;
  monthSpend: number; carried: number; grandTotal: number;
  forwardOut: number; isBase: boolean;
  items: ExpenseItem[];
  categories: Record<string, number>;
};
type ExpenseCalc = {
  results: CalcResult[];
  base: number;
  baseMembers: CalcResult[];
  totalMonthSpend: number;
  totalExtra: number;
  totalForward: number;
};

export default function ExpensesPage() {
  const { members, currentMember } = useApp();
  const { toast } = useToast();
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [calc, setCalc] = useState<ExpenseCalc | null>(null);
  const [forms, setForms] = useState<Record<string, { name: string; category: string; price: string }>>({});

  const mk = monthKey(month);

  const load = useCallback(async () => {
    const res = await fetch(`/api/expenses/${mk}`);
    if (res.ok) {
      const data = await res.json();
      setCalc(data?.calculation || null);
    }
  }, [mk]);

  useEffect(() => { load(); }, [load]);

  const shiftMonth = (delta: number) =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const canEditFor = (memberId: string) =>
    !!(currentMember && (currentMember.id === memberId || currentMember.isAdmin));

  const getForm = (memberId: string) =>
    forms[memberId] || { name: '', category: 'Other', price: '' };

  const setForm = (memberId: string, patch: Partial<{ name: string; category: string; price: string }>) =>
    setForms((p) => ({ ...p, [memberId]: { ...getForm(memberId), ...patch } }));

  const addExpense = async (memberId: string) => {
    if (!currentMember) { toast('Sign in to add expenses', 'error'); return; }
    if (!canEditFor(memberId)) { toast('You can only edit your own expenses', 'error'); return; }
    const f = getForm(memberId);
    if (!f.name.trim()) { toast('Enter an item name', 'error'); return; }
    const price = parseFloat(f.price);
    if (!price || price <= 0) { toast('Enter a valid price', 'error'); return; }

    const res = await fetch(`/api/expenses/${mk}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemName: f.name.trim(), price, category: f.category, memberId }),
    });
    if (!res.ok) { const d = await res.json(); toast(d.error || 'Could not add expense', 'error'); return; }
    toast('Expense added');
    setForm(memberId, { name: '', price: '', category: 'Other' });
    load();
  };

  const removeExpense = async (itemId: string, memberId: string) => {
    if (!canEditFor(memberId)) { toast('You can only edit your own expenses', 'error'); return; }
    const res = await fetch(`/api/expenses/${mk}/${itemId}`, { method: 'DELETE' });
    if (!res.ok) { toast('Could not remove', 'error'); return; }
    toast('Expense removed');
    load();
  };

  const baseNames = calc?.baseMembers?.map((r) => r.name).join(', ') || '';

  return (
    <section className="page active">
      <div className="month-panel">
        <div className="month-panel__header">
          <button className="month-nav-btn" onClick={() => shiftMonth(-1)} type="button" aria-label="Previous month">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="month-panel__header-inner">
            <div className="month-panel__label">{MONTH_NAMES[month.getMonth()]}</div>
            <div className="month-panel__year">{month.getFullYear()} · Expense Period</div>
          </div>
          <button className="month-nav-btn" onClick={() => shiftMonth(1)} type="button" aria-label="Next month">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <div className="month-panel__body">
          {!calc?.results?.length ? (
            <div className="empty">
              <h3>No members configured</h3>
              <p>Add members in Configuration first.</p>
            </div>
          ) : (
            <>
              <div className="info-box expense-info">
                <strong>How it works:</strong> The member with the <em>lowest total</em> (this month + carry forward)
                sets the base. Everyone else pays the extra above that base, forwarded to the next month.
              </div>

              <div className="summary-pills">
                <div className="summary-pill">
                  <div className="summary-pill__label">Month Spend</div>
                  <div className="summary-pill__value">{fmt(calc.totalMonthSpend)}</div>
                </div>
                <div className="summary-pill">
                  <div className="summary-pill__label">Base Amount</div>
                  <div className="summary-pill__value" style={{ color: 'var(--sky)' }}>{fmt(calc.base)}</div>
                </div>
                <div className="summary-pill">
                  <div className="summary-pill__label">Total Extra</div>
                  <div className="summary-pill__value" style={{ color: 'var(--amber)' }}>{fmt(calc.totalExtra)}</div>
                </div>
                <div className="summary-pill">
                  <div className="summary-pill__label">Forward Next Month</div>
                  <div className="summary-pill__value" style={{ color: 'var(--accent)' }}>{fmt(calc.totalForward)}</div>
                </div>
              </div>

              {calc.baseMembers?.length > 0 && (
                <div className="expense-base-banner">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  Base member{calc.baseMembers.length > 1 ? 's' : ''}: <strong>{baseNames}</strong> at {fmt(calc.base)}
                </div>
              )}

              <div className="section-head">
                <div className="section-head__title">Expense Book <span>All Members</span></div>
                <span className="chip chip--accent">{monthLabel(month)}</span>
              </div>

              <div className="expense-books-grid">
                {calc.results.map((r, i) => {
                  const editable = canEditFor(r.id);
                  const isYou = !!(currentMember && currentMember.id === r.id);
                  const f = getForm(r.id);

                  return (
                    <div key={r.id} className={`expense-book${r.isBase ? ' expense-book--base' : ''}`} style={{ animationDelay: `${i * 0.06}s` }}>
                      <div className="expense-book__head">
                        <Avatar name={r.name} photoUrl={r.photoUrl} index={i} />
                        <div className="expense-book__meta">
                          <div className="expense-book__name">
                            {r.name}
                            {isYou && <span className="expense-book__you">You</span>}
                            {r.isBase && <span className="expense-book__base-badge">Base</span>}
                          </div>
                          <div className="expense-book__spend">{fmt(r.monthSpend)} this month</div>
                        </div>
                      </div>

                      <div className="expense-book__items">
                        {r.items.length === 0 ? (
                          <div className="expense-empty">
                            No expenses logged yet{editable ? ' — add your first item below' : ''}
                          </div>
                        ) : (
                          r.items.map((item) => (
                            <div key={item.id} className="expense-item">
                              <div className="expense-item__main">
                                <span
                                  className="expense-item__category"
                                  style={{ '--cat-color': EXPENSE_CATEGORY_COLORS[item.category] || EXPENSE_CATEGORY_COLORS.Other } as React.CSSProperties}
                                >
                                  {item.category}
                                </span>
                                <span className="expense-item__name">{item.itemName}</span>
                              </div>
                              <div className="expense-item__right">
                                <span className="expense-item__price">{fmt(item.price)}</span>
                                {editable && (
                                  <button
                                    type="button"
                                    className="expense-item__remove"
                                    title="Remove"
                                    onClick={() => removeExpense(item.id, r.id)}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <line x1="18" y1="6" x2="6" y2="18" />
                                      <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {editable ? (
                        <div className="expense-form">
                          <input
                            className="form-input expense-form__name"
                            placeholder="Item name"
                            maxLength={80}
                            value={f.name}
                            onChange={(e) => setForm(r.id, { name: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') addExpense(r.id); }}
                          />
                          <div className="expense-form__row">
                            <select
                              className="form-input expense-form__category"
                              value={f.category}
                              onChange={(e) => setForm(r.id, { category: e.target.value })}
                            >
                              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <input
                              className="form-input expense-form__price"
                              type="number"
                              min="1"
                              placeholder="Price (৳)"
                              value={f.price}
                              onChange={(e) => setForm(r.id, { price: e.target.value })}
                            />
                            <button
                              className="btn btn-primary btn-sm"
                              type="button"
                              onClick={() => addExpense(r.id)}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="expense-readonly-hint">
                          {currentMember ? 'Sign in as this member or Admin to edit' : 'Sign in to add your expenses'}
                        </div>
                      )}

                      <div className="expense-book__totals">
                        {r.carried > 0 && (
                          <div className="bill-row">
                            <span className="bill-row__label">Carried forward</span>
                            <span className="bill-row__value" style={{ color: 'var(--amber)' }}>+{fmt(r.carried).slice(1)}</span>
                          </div>
                        )}
                        <div className="bill-row">
                          <span className="bill-row__label">Month spend</span>
                          <span className="bill-row__value">{fmt(r.monthSpend)}</span>
                        </div>
                        <div className="bill-row">
                          <span className="bill-row__label">Grand total</span>
                          <span className="bill-row__value">{fmt(r.grandTotal)}</span>
                        </div>
                        <div className="bill-row bill-row--adj">
                          <span className="bill-row__label">Extra above base</span>
                          <span className={`bill-row__value${r.forwardOut > 0 ? ' bill-row__value--lend' : ''}`}>
                            {r.forwardOut > 0 ? `+${fmt(r.forwardOut).slice(1)}` : '—'}
                          </span>
                        </div>
                        <div className="bill-row" style={{ borderTop: '1px solid rgba(45,212,191,0.22)', marginTop: 8, paddingTop: 12 }}>
                          <span className="bill-row__label" style={{ fontWeight: 700, color: 'var(--text)' }}>Forward next month</span>
                          <span className="bill-row__value" style={{ color: 'var(--accent)', fontSize: 16 }}>{fmt(r.forwardOut)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Summary table ── */}
              <div className="table-wrap">
                <table className="data-table expense-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Month Spend</th>
                      <th>Carried</th>
                      <th>Grand Total</th>
                      <th>Extra</th>
                      <th>Forward</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calc.results.map((r) => (
                      <tr key={r.id} className={r.isBase ? 'expense-table__base-row' : ''}>
                        <td>
                          {r.name}
                          {r.isBase && <span className="expense-book__base-badge" style={{ marginLeft: 8 }}>Base</span>}
                        </td>
                        <td>{fmt(r.monthSpend)}</td>
                        <td>{r.carried ? fmt(r.carried) : '—'}</td>
                        <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{fmt(r.grandTotal)}</td>
                        <td style={{ color: r.forwardOut > 0 ? 'var(--amber)' : 'var(--text-dim)' }}>
                          {r.forwardOut > 0 ? fmt(r.forwardOut) : '—'}
                        </td>
                        <td style={{ color: 'var(--accent)' }}>{fmt(r.forwardOut)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
