'use client';

import { useCallback, useEffect, useState } from 'react';
import { fmt } from '@/lib/utils';
import { MONTH_NAMES } from '@/lib/constants';
import { Avatar } from '@/components/ui/Avatar';
import { useApp } from '@/components/providers/AppProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { BankCardModal } from '@/components/ui/BankCardModal';

const DAY_INITIAL = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // by getDay() 0=Sun…6=Sat
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function MealsPage() {
  const { members, currentMember, apartment } = useApp();
  const { toast } = useToast();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [weekIndex, setWeekIndex] = useState(0);
  const [checklist, setChecklist] = useState<Record<string, unknown> | null>(null);
  const [mealData, setMealData] = useState<Record<string, unknown> | null>(null);
  const [shopForm, setShopForm] = useState({ itemName: '', amount: '' });
  const [bankOpen, setBankOpen] = useState(false);

  const mk = `${year}-${String(month).padStart(2, '0')}`;
  const canEdit = currentMember?.isAdmin || currentMember?.isBillManager;
  const isFinalized = Boolean(mealData?.isFinalized);

  const load = useCallback(async () => {
    const [mealRes, checkRes] = await Promise.all([
      fetch(`/api/meals/${mk}`),
      fetch(`/api/meals/${mk}/checklist?week=${weekIndex}`),
    ]);
    setMealData(mealRes.ok ? await mealRes.json() : null);
    setChecklist(checkRes.ok ? await checkRes.json() : null);
  }, [mk, weekIndex]);

  useEffect(() => { load(); }, [load]);

  const toggleMeal = async (memberId: string, mealDate: string, mealSlot: number, current: boolean) => {
    if (!canEdit || isFinalized) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    if (mealDate > todayStr) return;
    await fetch(`/api/meals/${mk}/checklist`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, mealDate, mealSlot, isConfirmed: !current }),
    });
    load();
  };

  const addShopping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMember) { toast('Sign in to add shopping', 'error'); return; }
    const res = await fetch(`/api/meals/${mk}/shopping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: currentMember.id,
        itemName: shopForm.itemName,
        amount: Number(shopForm.amount),
        purchaseDate: new Date().toISOString().slice(0, 10),
      }),
    });
    if (!res.ok) { toast('Could not add item', 'error'); return; }
    toast('Shopping item added');
    setShopForm({ itemName: '', amount: '' });
    load();
  };

  const finalize = async () => {
    const res = await fetch(`/api/meals/${mk}/finalize`, { method: 'POST' });
    if (!res.ok) { toast('Could not finalize', 'error'); return; }
    toast('Meals finalized');
    load();
  };

  const weekDates = (checklist?.weekDates as string[]) || [];
  const totalWeeks = (checklist?.totalWeeks as number) || 1;
  const records = (checklist?.records as { memberId: string; mealDate: string; mealSlot: number; isConfirmed: boolean }[]) || [];
  const mealConfig = checklist?.mealConfig as { mealNames: string[]; mealsPerDay: number } | undefined;
  const mealNames = mealConfig?.mealNames || ['Lunch', 'Dinner'];
  const slots = mealConfig?.mealsPerDay || 2;
  const summary = mealData?.summary as {
    totalShoppingPool: number; totalMealCount: number; perMealCost: number;
    memberSummaries: { memberId: string; mealCount: number; shoppingContribution: number; mealCostDue: number; net: number }[];
  };
  const shopping = (mealData?.shopping as {
    id: string; itemName: string; amount: number;
    member: { name: string; photoUrl?: string | null };
  }[]) || [];

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = `${year}-${String(month).padStart(2, '0')}`;
  const activeMembers = members.filter((m) => m.isActive !== false);

  const getRecord = (memberId: string, date: string, slot: number) =>
    records.find((r) => r.memberId === memberId && r.mealDate.startsWith(date) && r.mealSlot === slot);

  const getMemberWeekCount = (memberId: string) =>
    weekDates.reduce((count, d) => {
      for (let s = 0; s < slots; s++) {
        if (getRecord(memberId, d, s)?.isConfirmed) count++;
      }
      return count;
    }, 0);

  const weekLabel = weekDates.length > 0
    ? `${SHORT_MONTHS[Number(weekDates[0].slice(5, 7)) - 1]} ${Number(weekDates[0].slice(8))} – ${SHORT_MONTHS[Number(weekDates[weekDates.length - 1].slice(5, 7)) - 1]} ${Number(weekDates[weekDates.length - 1].slice(8))}`
    : `${MONTH_NAMES[month - 1]} ${year}`;

  return (
    <section className="page active">
      {/* ── Header ── */}
      <div className="panel-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="panel-head__title">Meal Management</div>
          {isFinalized && <span className="chip chip--locked" style={{ fontSize: 11 }}>Finalized</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="form-input" value={month} onChange={(e) => { setMonth(Number(e.target.value)); setWeekIndex(0); }} aria-label="Month">
            {MONTH_NAMES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
          </select>
          <select className="form-input" value={year} onChange={(e) => { setYear(Number(e.target.value)); setWeekIndex(0); }} aria-label="Year">
            {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {apartment?.billManagerId && (
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setBankOpen(true)}>👁 Bank</button>
          )}
        </div>
      </div>

      {/* ── Stat strip ── */}
      <div className="meals-stat-strip">
        <div className="meals-stat-tile">
          <span className="meals-stat-tile__icon">🍽</span>
          <div>
            <div className="meals-stat-tile__val">{fmt(summary?.perMealCost || 0)}</div>
            <div className="meals-stat-tile__lbl">Per Meal</div>
          </div>
        </div>
        <div className="meals-stat-tile">
          <span className="meals-stat-tile__icon">🛒</span>
          <div>
            <div className="meals-stat-tile__val">{fmt(summary?.totalShoppingPool || 0)}</div>
            <div className="meals-stat-tile__lbl">Pool Total</div>
          </div>
        </div>
        <div className="meals-stat-tile">
          <span className="meals-stat-tile__icon">✅</span>
          <div>
            <div className="meals-stat-tile__val">{summary?.totalMealCount || 0}</div>
            <div className="meals-stat-tile__lbl">Total Meals</div>
          </div>
        </div>
        <div className="meals-stat-tile">
          <span className="meals-stat-tile__icon">👥</span>
          <div>
            <div className="meals-stat-tile__val">{activeMembers.length}</div>
            <div className="meals-stat-tile__lbl">Members</div>
          </div>
        </div>
      </div>

      {/* ── Weekly Checklist ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="meal-grid-header-row">
          <div>
            <div className="card__title" style={{ marginBottom: 2 }}>Weekly Checklist</div>
            <div className="form-hint">{weekLabel}</div>
          </div>
          <div className="meal-week-nav">
            <button
              className="meal-week-nav-btn"
              type="button"
              onClick={() => setWeekIndex((w) => Math.max(0, w - 1))}
              disabled={weekIndex === 0}
            >←</button>
            <span className="meal-week-nav-label">Week {weekIndex + 1}/{totalWeeks}</span>
            <button
              className="meal-week-nav-btn"
              type="button"
              onClick={() => setWeekIndex((w) => Math.min(totalWeeks - 1, w + 1))}
              disabled={weekIndex >= totalWeeks - 1}
            >→</button>
          </div>
        </div>

        {weekDates.length === 0 ? (
          <div className="expense-empty">No data for this period</div>
        ) : (
          <div className="meal-scroll-wrap">
            <table className="meal-grid-table">
              <thead>
                <tr>
                  {/* Member column header */}
                  <th className="meal-grid-member-th">
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Members
                    </span>
                  </th>
                  {/* Day column headers */}
                  {weekDates.map((d) => {
                    const dayOfWeek = new Date(d + 'T12:00:00').getDay();
                    const dayNum = Number(d.slice(8));
                    const monthNum = Number(d.slice(5, 7));
                    const isThisMonth = d.startsWith(currentMonthStr);
                    const isToday = d === todayStr;
                    return (
                      <th key={d} className={`meal-day-th${!isThisMonth ? ' meal-day-th--other' : ''}`}>
                        <div className="meal-day-col-inner">
                          <span className="meal-day-letter">{DAY_INITIAL[dayOfWeek]}</span>
                          <span className={`meal-day-num${isToday ? ' meal-day-num--today' : ''}${!isThisMonth ? ' meal-day-num--other' : ''}`}>
                            {dayNum}
                          </span>
                          {!isThisMonth && (
                            <span className="meal-day-mon">{SHORT_MONTHS[monthNum - 1]}</span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {activeMembers.map((m, i) => {
                  const weekCount = getMemberWeekCount(m.id);
                  return (
                    <tr key={m.id} className="meal-grid-row">
                      {/* Avatar-only member cell */}
                      <td className="meal-grid-member-cell">
                        <div className="meal-avatar-wrap" title={m.name}>
                          <Avatar name={m.name} photoUrl={m.photoUrl} index={i} size="sm" />
                          {weekCount > 0 && (
                            <span className="meal-count-badge">{weekCount}</span>
                          )}
                        </div>
                      </td>
                      {/* Day cells */}
                      {weekDates.map((d) => {
                        const isThisMonth = d.startsWith(currentMonthStr);
                        const isFuture = d > todayStr;
                        const isToday = d === todayStr;
                        return (
                          <td
                            key={d}
                            className={`meal-day-cell${!isThisMonth ? ' meal-day-cell--other' : ''}${isToday ? ' meal-day-cell--today' : ''}`}
                          >
                            <div className="meal-slot-group">
                              {Array.from({ length: slots }, (_, slot) => {
                                const rec = getRecord(m.id, d, slot);
                                const confirmed = rec?.isConfirmed;
                                const label = (mealNames[slot] || (slot === 0 ? 'L' : 'D'))[0].toUpperCase();
                                return (
                                  <button
                                    key={slot}
                                    type="button"
                                    className={`meal-dot${confirmed ? ' meal-dot--on' : ''}${isFuture ? ' meal-dot--future' : ''}`}
                                    disabled={!canEdit || isFinalized || isFuture}
                                    onClick={() => toggleMeal(m.id, d, slot, !!confirmed)}
                                    title={`${mealNames[slot] || (slot === 0 ? 'Lunch' : 'Dinner')} · ${m.name} · ${d}`}
                                  >
                                    {confirmed ? '✓' : label}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        <div className="meal-legend">
          {mealNames.slice(0, slots).map((name, s) => (
            <span key={s} className="meal-legend-item">
              <span className="meal-dot meal-dot--on" style={{ display: 'inline-flex', fontSize: 9 }}>
                {name[0].toUpperCase()}
              </span>
              {name}
            </span>
          ))}
          <span className="meal-legend-item">
            <span className="meal-dot" style={{ display: 'inline-flex', fontSize: 9, opacity: 0.5 }}>–</span>
            Not confirmed
          </span>
          {canEdit && !isFinalized && (
            <span className="meal-legend-item" style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 11 }}>
              Click to toggle
            </span>
          )}
        </div>
      </div>

      {/* ── Shopping + Summary ── */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Shopping Pool */}
        <div className="card">
          <div className="card__title" style={{ marginBottom: 4 }}>🛒 Shopping Pool</div>
          <div className="card__sub">Total: {fmt(summary?.totalShoppingPool || 0)}</div>

          {shopping.length === 0 ? (
            <div className="expense-empty">No shopping items yet</div>
          ) : (
            <div className="meal-shop-list">
              {shopping.map((s, si) => {
                const mIdx = members.findIndex((x) => x.name === s.member.name);
                return (
                  <div key={s.id} className="meal-shop-item">
                    <Avatar name={s.member.name} photoUrl={s.member.photoUrl ?? null} index={mIdx >= 0 ? mIdx : si} size="xs" />
                    <div className="meal-shop-item__body">
                      <span className="meal-shop-item__name">{s.itemName}</span>
                      <span className="meal-shop-item__by">{s.member.name}</span>
                    </div>
                    <strong className="meal-shop-item__amt">{fmt(s.amount)}</strong>
                  </div>
                );
              })}
            </div>
          )}

          {currentMember && !isFinalized && (
            <form onSubmit={addShopping} className="meal-add-form">
              <input
                className="form-input"
                placeholder="Item name"
                value={shopForm.itemName}
                onChange={(e) => setShopForm({ ...shopForm, itemName: e.target.value })}
                required
              />
              <input
                className="form-input"
                type="number"
                placeholder="Amount (৳)"
                value={shopForm.amount}
                onChange={(e) => setShopForm({ ...shopForm, amount: e.target.value })}
                required
                min="0"
              />
              <button className="btn btn-primary btn-sm" type="submit" style={{ whiteSpace: 'nowrap' }}>+ Add</button>
            </form>
          )}
        </div>

        {/* Monthly Summary */}
        <div className="card">
          <div className="card__title" style={{ marginBottom: 4 }}>📊 Monthly Summary</div>
          <div className="card__sub">{summary?.totalMealCount || 0} meals · {fmt(summary?.perMealCost || 0)} each</div>

          {!summary?.memberSummaries?.length ? (
            <div className="expense-empty">No meal data yet</div>
          ) : (
            <div className="meal-summary-cards">
              {summary.memberSummaries.map((s) => {
                const m = members.find((x) => x.id === s.memberId);
                if (!m) return null;
                const mIdx = members.indexOf(m);
                const netPositive = s.net > 0;
                const netNegative = s.net < 0;
                return (
                  <div key={s.memberId} className="meal-summary-member">
                    <Avatar name={m.name} photoUrl={m.photoUrl} index={mIdx} size="sm" />
                    <div className="meal-summary-member__info">
                      <div className="meal-summary-member__name">{m.name}</div>
                      <div className="meal-summary-member__meta">
                        {s.mealCount} meals · shopped {fmt(s.shoppingContribution)}
                      </div>
                    </div>
                    <div className={`meal-summary-member__net${netPositive ? ' text-danger' : netNegative ? ' text-success' : ''}`}>
                      {s.net > 0
                        ? `owes ${fmt(s.net)}`
                        : s.net < 0
                        ? `+${fmt(Math.abs(s.net))}`
                        : '✓ even'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {canEdit && !isFinalized && (
            <button className="btn btn-primary btn-sm" type="button" onClick={finalize} style={{ marginTop: 16 }}>
              Finalize Month
            </button>
          )}
          {isFinalized && (
            <div style={{ marginTop: 12 }}>
              <span className="chip chip--locked">✓ Finalized</span>
            </div>
          )}
        </div>
      </div>

      {apartment?.billManagerId && (
        <BankCardModal memberId={apartment.billManagerId} open={bankOpen} onClose={() => setBankOpen(false)} />
      )}
    </section>
  );
}
