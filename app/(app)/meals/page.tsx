'use client';

import { useCallback, useState } from 'react';
import useSWR from 'swr';
import { fmt, monthKey } from '@/lib/utils';
import { MONTH_NAMES } from '@/lib/constants';
import { Avatar } from '@/components/ui/Avatar';
import { useApp } from '@/components/providers/AppProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { PaymentMethodsModal } from '@/components/ui/PaymentMethodsModal';
import { mealChecklistKey, mealKey } from '@/lib/api/cache-keys';
import type { MealSlotOptInMatrix } from '@/lib/calculations/meals';
import { memberHasPerm } from '@/lib/client-permissions';

const DAY_INITIAL = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function MealsPage() {
  const { members, currentMember, apartment } = useApp();
  const { toast } = useToast();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [weekIndex, setWeekIndex] = useState(0);
  const [shopForm, setShopForm] = useState({ itemName: '', amount: '' });
  const [bankOpen, setBankOpen] = useState(false);
  const [planPending, setPlanPending] = useState<number | null>(null);

  const year = month.getFullYear();
  const monthNum = month.getMonth() + 1;
  const mk = monthKey(month);
  const { data: mealData, mutate: mutateMeal } = useSWR<Record<string, unknown>>(mealKey(mk));
  const { data: checklist, mutate: mutateChecklist } = useSWR<Record<string, unknown>>(
    mealChecklistKey(mk, weekIndex),
  );

  const canEditChecklist = memberHasPerm(currentMember, 'manage_meal_checklist');
  const isFinalized = Boolean(mealData?.isFinalized);
  const billManager = apartment?.billManagerId
    ? members.find((m) => m.id === apartment.billManagerId)
    : undefined;

  const load = useCallback(async () => {
    await Promise.all([mutateMeal(), mutateChecklist()]);
  }, [mutateMeal, mutateChecklist]);

  const shiftMonth = (delta: number) => {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
    setWeekIndex(0);
  };

  const toggleMeal = async (memberId: string, mealDate: string, mealSlot: number, current: boolean) => {
    if (!canEditChecklist || isFinalized) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    if (mealDate > todayStr) return;
    const res = await fetch(`/api/meals/${mk}/checklist`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, mealDate, mealSlot, isConfirmed: !current }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast(d.error || 'Could not update meal', 'error');
      return;
    }
    load();
  };

  const toggleMySlot = async (slot: number, optedIn: boolean) => {
    if (!currentMember || isFinalized) return;
    setPlanPending(slot);
    try {
      const res = await fetch('/api/config/meal-member-slots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: currentMember.id,
          slots: { [String(slot)]: optedIn },
        }),
      });
      if (!res.ok) {
        toast('Could not update your meal plan', 'error');
        return;
      }
      toast(optedIn ? 'Meal added to your plan' : 'Meal removed from your plan');
      await load();
    } finally {
      setPlanPending(null);
    }
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
  const mealConfig = (checklist?.mealConfig || mealData?.mealConfig) as {
    mealNames: string[];
    mealsPerDay: number;
    rateOverride?: number | null;
  } | undefined;
  const mealNames = mealConfig?.mealNames || ['Lunch', 'Dinner'];
  const slots = mealConfig?.mealsPerDay ?? mealNames.length;
  const slotOptInMatrix = (mealData?.slotOptInMatrix || checklist?.slotOptInMatrix || {}) as MealSlotOptInMatrix;

  const summary = mealData?.summary as {
    totalShoppingPool: number;
    foodExpensePool: number;
    shoppingPool: number;
    totalMealCount: number;
    perMealCost: number;
    rateMode: 'fixed' | 'auto';
    memberSummaries: {
      memberId: string;
      mealCount: number;
      shoppingContribution: number;
      foodContribution: number;
      mealShoppingContribution: number;
      mealCostDue: number;
      net: number;
      mealCountBySlot?: Record<number, number>;
    }[];
  };
  const shopping = (mealData?.shopping as {
    id: string; itemName: string; amount: number;
    member: { name: string; photoUrl?: string | null };
  }[]) || [];

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = `${year}-${String(monthNum).padStart(2, '0')}`;
  const activeMembers = members.filter((m) => m.isActive !== false);

  const isSlotOptedIn = (memberId: string, slot: number) =>
    slotOptInMatrix[memberId]?.[slot] !== false;

  const getRecord = (memberId: string, date: string, slot: number) =>
    records.find((r) => r.memberId === memberId && r.mealDate.startsWith(date) && r.mealSlot === slot);

  const getMemberWeekCount = (memberId: string) =>
    weekDates.reduce((count, d) => {
      for (let s = 0; s < slots; s++) {
        if (!isSlotOptedIn(memberId, s)) continue;
        if (getRecord(memberId, d, s)?.isConfirmed) count++;
      }
      return count;
    }, 0);

  const weekLabel = weekDates.length > 0
    ? `${SHORT_MONTHS[Number(weekDates[0].slice(5, 7)) - 1]} ${Number(weekDates[0].slice(8))} – ${SHORT_MONTHS[Number(weekDates[weekDates.length - 1].slice(5, 7)) - 1]} ${Number(weekDates[weekDates.length - 1].slice(8))}`
    : `${MONTH_NAMES[monthNum - 1]} ${year}`;

  const myEnrolled = currentMember
    ? mealNames.filter((_, s) => isSlotOptedIn(currentMember.id, s)).length
    : 0;

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
            <div className="month-panel__year">{month.getFullYear()} · Meal Period</div>
          </div>
          <button className="month-nav-btn" onClick={() => shiftMonth(1)} aria-label="Next month" type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <div className="month-panel__body">
          <div className="month-panel__toolbar">
            {isFinalized && (
              <span className="locked-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Finalized
              </span>
            )}
            {apartment?.billManagerId && (
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setBankOpen(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Bill Manager payment info
              </button>
            )}
          </div>

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
            <div className="meals-stat-tile__lbl">Meal pool</div>
          </div>
        </div>
        <div className="meals-stat-tile">
          <span className="meals-stat-tile__icon">✅</span>
          <div>
            <div className="meals-stat-tile__val">{summary?.totalMealCount || 0}</div>
            <div className="meals-stat-tile__lbl">Confirmed Meals</div>
          </div>
        </div>
        <div className="meals-stat-tile">
          <span className="meals-stat-tile__icon">📐</span>
          <div>
            <div className="meals-stat-tile__val">
              {summary?.rateMode === 'fixed' ? 'Fixed rate' : 'Food ÷ meals'}
            </div>
            <div className="meals-stat-tile__lbl">Rate mode</div>
          </div>
        </div>
      </div>

      {currentMember && !isFinalized && (
        <div className="card my-meal-plan">
          <div className="my-meal-plan__head">
            <div>
              <div className="card__title" style={{ marginBottom: 4 }}>My meal plan</div>
              <div className="card__sub">
                Choose which meals you take — you are billed only for checked slots ({myEnrolled} of {mealNames.length}).
              </div>
            </div>
            <Avatar name={currentMember.name} photoUrl={currentMember.photoUrl} index={members.indexOf(currentMember)} size="sm" />
          </div>
          <ul className="my-meal-plan__list">
            {mealNames.slice(0, slots).map((name, slot) => {
              const optedIn = isSlotOptedIn(currentMember.id, slot);
              return (
                <li key={slot} className={`my-meal-plan__item${optedIn ? ' my-meal-plan__item--on' : ''}`}>
                  <label className="member-opt-in__check">
                    <input
                      type="checkbox"
                      checked={optedIn}
                      disabled={planPending === slot}
                      onChange={(e) => toggleMySlot(slot, e.target.checked)}
                    />
                    <span className="member-opt-in__check-ui" aria-hidden />
                    <span className="my-meal-plan__name">{name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="meal-grid-header-row">
          <div>
            <div className="card__title" style={{ marginBottom: 2 }}>Weekly Checklist</div>
            <div className="form-hint">{weekLabel} · Admin marks attendance per enrolled meal</div>
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
                  <th className="meal-grid-member-th">
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Members
                    </span>
                  </th>
                  {weekDates.map((d) => {
                    const dayOfWeek = new Date(d + 'T12:00:00').getDay();
                    const dayNum = Number(d.slice(8));
                    const monthNumLocal = Number(d.slice(5, 7));
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
                            <span className="meal-day-mon">{SHORT_MONTHS[monthNumLocal - 1]}</span>
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
                  const enrolledSlots = mealNames.filter((_, s) => isSlotOptedIn(m.id, s)).length;
                  return (
                    <tr key={m.id} className="meal-grid-row">
                      <td className="meal-grid-member-cell">
                        <div className="meal-avatar-wrap" title={`${m.name} · ${enrolledSlots} meals`}>
                          <Avatar name={m.name} photoUrl={m.photoUrl} index={i} size="sm" />
                          {weekCount > 0 && (
                            <span className="meal-count-badge">{weekCount}</span>
                          )}
                        </div>
                      </td>
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
                                const optedIn = isSlotOptedIn(m.id, slot);
                                if (!optedIn) {
                                  return (
                                    <span
                                      key={slot}
                                      className="meal-dot meal-dot--off-plan"
                                      title={`${mealNames[slot]} — not in plan`}
                                    >
                                      –
                                    </span>
                                  );
                                }
                                const rec = getRecord(m.id, d, slot);
                                const confirmed = rec?.isConfirmed;
                                const label = (mealNames[slot] || 'M')[0].toUpperCase();
                                return (
                                  <button
                                    key={slot}
                                    type="button"
                                    className={`meal-dot${confirmed ? ' meal-dot--on' : ''}${isFuture ? ' meal-dot--future' : ''}`}
                                    disabled={!canEditChecklist || isFinalized || isFuture}
                                    onClick={() => toggleMeal(m.id, d, slot, !!confirmed)}
                                    title={`${mealNames[slot]} · ${m.name} · ${d}`}
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
            <span className="meal-dot meal-dot--off-plan" style={{ display: 'inline-flex', fontSize: 9 }}>–</span>
            Not in plan
          </span>
          <span className="meal-legend-item">
            <span className="meal-dot" style={{ display: 'inline-flex', fontSize: 9, opacity: 0.5 }}>L</span>
            Not confirmed
          </span>
          {canEditChecklist && !isFinalized && (
            <span className="meal-legend-item" style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 11 }}>
              Click to toggle attendance
            </span>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card__title" style={{ marginBottom: 4 }}>🛒 Meal pool</div>
          <div className="card__sub">
            Food expenses {fmt(summary?.foodExpensePool || 0)} + shopping {fmt(summary?.shoppingPool || 0)} = {fmt(summary?.totalShoppingPool || 0)}
          </div>

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

        <div className="card">
          <div className="card__title" style={{ marginBottom: 4 }}>📊 Monthly Summary</div>
          <div className="card__sub">
            {summary?.totalMealCount || 0} confirmed · {fmt(summary?.perMealCost || 0)} per meal
            {summary?.rateMode === 'auto' && summary?.totalMealCount > 0 && (
              <> · auto from meal pool</>
            )}
          </div>

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
                const slotBreakdown = mealNames
                  .map((name, slot) => (s.mealCountBySlot?.[slot] ? `${name} ${s.mealCountBySlot[slot]}` : null))
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <div key={s.memberId} className="meal-summary-member">
                    <Avatar name={m.name} photoUrl={m.photoUrl} index={mIdx} size="sm" />
                    <div className="meal-summary-member__info">
                      <div className="meal-summary-member__name">{m.name}</div>
                      <div className="meal-summary-member__meta">
                        {s.mealCount} meals · contributed {fmt(s.shoppingContribution)}
                        {(s.foodContribution > 0 || s.mealShoppingContribution > 0) && (
                          <span className="meal-summary-member__contrib">
                            ({s.foodContribution > 0 ? `food ${fmt(s.foodContribution)}` : ''}
                            {s.foodContribution > 0 && s.mealShoppingContribution > 0 ? ' + ' : ''}
                            {s.mealShoppingContribution > 0 ? `shop ${fmt(s.mealShoppingContribution)}` : ''})
                          </span>
                        )}
                      </div>
                      {slotBreakdown && (
                        <div className="meal-summary-member__slots">{slotBreakdown}</div>
                      )}
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

          {canEditChecklist && !isFinalized && (
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
        </div>
      </div>

      {apartment?.billManagerId && (
        <PaymentMethodsModal
          memberId={apartment.billManagerId}
          memberName={billManager?.name}
          open={bankOpen}
          onClose={() => setBankOpen(false)}
        />
      )}
    </section>
  );
}
