'use client';

import { startTransition, useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { fmt, monthLabel, memberColor } from '@/lib/utils';
import { MONTH_NAMES, EXPENSE_CATEGORY_COLORS } from '@/lib/constants';
import { ChartBox } from '@/components/charts/ChartBox';
import { Avatar } from '@/components/ui/Avatar';
import { useApp } from '@/components/providers/AppProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import { profileKey } from '@/lib/api/cache-keys';
import { MemberLoginModal } from '@/components/auth/MemberLoginModal';

type ProfileTab = 'overview' | 'bills' | 'meals' | 'expenses';

type ProfileData = {
  member: {
    id: string;
    name: string;
    photoUrl?: string | null;
    roleLabel: string;
    isAdmin?: boolean;
    isBillManager?: boolean;
  };
  apartmentName: string;
  year: number;
  months: {
    monthKey: string;
    billTotal: number;
    billBreakdown: { fixedBucket: number; electricity: number; meals: number; optional: number };
    expenseTotal: number;
    mealCount: number;
  }[];
  yearBillTotal: number;
  yearExpenseTotal: number;
  yearMealCount: number;
  yearGrandTotal: number;
  expenseByCategory: Record<string, number>;
  optionalYearBreakdown: { name: string; amount: number }[];
  currentMonth: {
    monthKey: string;
    billDue: number;
    billBreakdown: { fixedBucket: number; electricity: number; meals: number; optional: number };
    mealCount: number;
    mealNet: number;
    mealContribution: number;
    perMealCost: number;
  };
  optedInCosts: { id: string; name: string; amount: number }[];
  enrolledMealSlots: { slot: number; name: string }[];
  recentExpenses: {
    id: string;
    itemName: string;
    price: number;
    category: string;
    monthKey: string;
  }[];
};

const TABS: { id: ProfileTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'bills', label: 'Bills' },
  { id: 'meals', label: 'Meals' },
  { id: 'expenses', label: 'Expenses' },
];

export default function ProfilePage() {
  const { currentMember, members, apartment } = useApp();
  const { theme } = useTheme();
  const [tab, setTab] = useState<ProfileTab>('overview');
  const [loginOpen, setLoginOpen] = useState(false);
  const year = new Date().getFullYear();

  const { data, isLoading } = useSWR<ProfileData>(
    currentMember ? profileKey(year) : null,
  );

  const memberIndex = currentMember
    ? members.findIndex((m) => m.id === currentMember.id)
    : 0;
  const gapNeutral = theme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)';

  if (!currentMember) {
    return (
      <section className="page active profile-page">
        <div className="profile-guest">
          <Avatar name="?" index={0} size="lg" />
          <h2>Your profile</h2>
          <p>Sign in to see your spending, meals, and bill breakdown.</p>
          <button type="button" className="btn btn-primary" onClick={() => setLoginOpen(true)}>
            Sign in
          </button>
        </div>
        <MemberLoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      </section>
    );
  }

  const months = data?.months ?? [];
  const monthLabels = useMemo(
    () => months.map((m) => MONTH_NAMES[Number(m.monthKey.slice(5, 7)) - 1].slice(0, 3)),
    [months],
  );

  const spendTrend = useMemo(() => ({
    labels: monthLabels,
    datasets: [
      {
        label: 'Bills',
        data: months.map((m) => m.billTotal),
        borderColor: '#2dd4bf',
        backgroundColor: 'rgba(45, 212, 191, 0.12)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        borderWidth: 2,
      },
      {
        label: 'Expenses',
        data: months.map((m) => m.expenseTotal),
        borderColor: '#a78bfa',
        backgroundColor: 'rgba(167, 139, 250, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        borderWidth: 2,
      },
    ],
  }), [monthLabels, months]);

  const mealTrend = useMemo(() => ({
    labels: monthLabels,
    datasets: [{
      label: 'Confirmed meals',
      data: months.map((m) => m.mealCount),
      backgroundColor: 'rgba(56, 189, 248, 0.65)',
      borderColor: '#38bdf8',
      borderWidth: 1,
      borderRadius: 6,
    }],
  }), [monthLabels, months]);

  const spendChartOptions = useMemo(() => ({
    scales: { x: { grid: { color: gapNeutral } }, y: { grid: { color: gapNeutral } } },
  }), [gapNeutral]);

  const currentBd = data?.currentMonth?.billBreakdown;
  const breakdownItems = currentBd
    ? [
        { label: 'Rent + utilities bucket', value: currentBd.fixedBucket, color: '#2dd4bf' },
        { label: 'Electricity', value: currentBd.electricity, color: '#38bdf8' },
        { label: 'Meals', value: currentBd.meals, color: '#a78bfa' },
        { label: 'Optional costs', value: currentBd.optional, color: '#f472b6' },
      ].filter((x) => x.value > 0)
    : [];

  const maxBreakdown = Math.max(...breakdownItems.map((x) => x.value), 1);

  const categoryEntries = useMemo(
    () => Object.entries(data?.expenseByCategory ?? {}).sort((a, b) => b[1] - a[1]),
    [data?.expenseByCategory],
  );

  const categoryChart = useMemo(() => ({
    labels: categoryEntries.map(([c]) => c),
    datasets: [{
      data: categoryEntries.map(([, v]) => v),
      backgroundColor: categoryEntries.map(([c]) => EXPENSE_CATEGORY_COLORS[c] || memberColor(memberIndex) + 'cc'),
      borderWidth: 0,
    }],
  }), [categoryEntries, memberIndex]);

  const optionalBars = (data?.optionalYearBreakdown ?? []).slice(0, 5);

  return (
    <section className="page active profile-page">
      <header className="profile-hero">
        <div className="profile-hero__identity">
          <Avatar
            name={currentMember.name}
            photoUrl={currentMember.photoUrl}
            index={memberIndex >= 0 ? memberIndex : 0}
            size="lg"
          />
          <div className="profile-hero__text">
            <h1 className="profile-hero__name">{currentMember.name}</h1>
            <p className="profile-hero__handle">{data?.apartmentName || apartment?.name}</p>
            <div className="profile-hero__badges">
              <span className="profile-badge profile-badge--role">{data?.member.roleLabel ?? 'Member'}</span>
              {data?.optedInCosts && data.optedInCosts.length > 0 && (
                <span className="profile-badge">{data.optedInCosts.length} shared costs</span>
              )}
              {data?.enrolledMealSlots && data.enrolledMealSlots.length > 0 && (
                <span className="profile-badge">{data.enrolledMealSlots.length} meal slots</span>
              )}
            </div>
          </div>
        </div>

        <div className="profile-hero__stats">
          <div className="profile-kpi">
            <span className="profile-kpi__val">{fmt(data?.currentMonth?.billDue ?? 0)}</span>
            <span className="profile-kpi__lbl">This month bills</span>
          </div>
          <div className="profile-kpi">
            <span className="profile-kpi__val">{fmt(data?.yearGrandTotal ?? 0)}</span>
            <span className="profile-kpi__lbl">Year total spend</span>
          </div>
          <div className="profile-kpi">
            <span className="profile-kpi__val">{data?.yearMealCount ?? 0}</span>
            <span className="profile-kpi__lbl">Meals confirmed</span>
          </div>
        </div>
      </header>

      <nav className="profile-tabs" aria-label="Profile sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`profile-tabs__btn${tab === t.id ? ' profile-tabs__btn--active' : ''}`}
            onClick={() => startTransition(() => setTab(t.id))}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {isLoading && !data && (
        <div className="profile-loading">Loading your analytics…</div>
      )}

      {(tab === 'overview' || tab === 'bills') && data && (
        <div className="profile-section">
          <div className="card profile-chart-card">
            <div className="card__title">
              <span className="card__title-icon" aria-hidden>📈</span>
              Spending trend — {year}
            </div>
            <div className="card__sub">Your monthly bills and personal expenses</div>
            <ChartBox
              type="line"
              className="chart-box--tall"
              data={spendTrend}
              options={spendChartOptions}
            />
          </div>
        </div>
      )}

      {tab === 'overview' && data && (
        <div className="grid-2 profile-widgets">
          <div className="card">
            <div className="card__title">This month breakdown</div>
            <div className="card__sub">{monthLabel(new Date(`${data.currentMonth.monthKey}-01`))}</div>
            {breakdownItems.length === 0 ? (
              <p className="profile-empty">No locked bill data for this month yet.</p>
            ) : (
              <ul className="profile-bar-list">
                {breakdownItems.map((item) => (
                  <li key={item.label} className="profile-bar-item">
                    <div className="profile-bar-item__head">
                      <span>{item.label}</span>
                      <strong>{fmt(item.value)}</strong>
                    </div>
                    <div className="profile-bar-item__track">
                      <div
                        className="profile-bar-item__fill"
                        style={{ width: `${(item.value / maxBreakdown) * 100}%`, background: item.color }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/bills" className="profile-link">View monthly bills →</Link>
          </div>

          <div className="card">
            <div className="card__title">Meals this month</div>
            <div className="card__sub">
              {data.currentMonth.mealCount} meals · {fmt(data.currentMonth.perMealCost)} / meal
            </div>
            <div className="profile-meal-stats">
              <div className="profile-meal-stat">
                <span className="profile-meal-stat__lbl">Contributed</span>
                <span className="profile-meal-stat__val">{fmt(data.currentMonth.mealContribution)}</span>
              </div>
              <div className="profile-meal-stat">
                <span className="profile-meal-stat__lbl">Net balance</span>
                <span className={`profile-meal-stat__val${data.currentMonth.mealNet > 0 ? ' text-danger' : data.currentMonth.mealNet < 0 ? ' text-success' : ''}`}>
                  {data.currentMonth.mealNet > 0
                    ? `Owes ${fmt(data.currentMonth.mealNet)}`
                    : data.currentMonth.mealNet < 0
                    ? `+${fmt(Math.abs(data.currentMonth.mealNet))}`
                    : 'Even'}
                </span>
              </div>
            </div>
            {data.enrolledMealSlots.length > 0 && (
              <ul className="profile-chip-list">
                {data.enrolledMealSlots.map((s) => (
                  <li key={s.slot} className="profile-chip">{s.name}</li>
                ))}
              </ul>
            )}
            <Link href="/meals" className="profile-link">Open meal management →</Link>
          </div>
        </div>
      )}

      {tab === 'bills' && data && (
        <div className="grid-2 profile-widgets">
          <div className="card">
            <div className="card__title">Optional costs (year)</div>
            <div className="card__sub">What you paid toward shared optional items</div>
            {optionalBars.length === 0 ? (
              <p className="profile-empty">No optional bill shares recorded this year.</p>
            ) : (
              <ul className="profile-bar-list">
                {optionalBars.map((item) => {
                  const max = optionalBars[0]?.amount || 1;
                  return (
                    <li key={item.name} className="profile-bar-item">
                      <div className="profile-bar-item__head">
                        <span>{item.name}</span>
                        <strong>{fmt(item.amount)}</strong>
                      </div>
                      <div className="profile-bar-item__track">
                        <div
                          className="profile-bar-item__fill"
                          style={{ width: `${(item.amount / max) * 100}%`, background: '#2dd4bf' }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="card">
            <div className="card__title">Enrolled shared costs</div>
            <div className="card__sub">You are opted in to these monthly charges</div>
            {data.optedInCosts.length === 0 ? (
              <p className="profile-empty">No optional costs assigned.</p>
            ) : (
              <ul className="profile-cost-list">
                {data.optedInCosts.map((c) => (
                  <li key={c.id}>
                    <span>{c.name}</span>
                    <strong>{fmt(c.amount)}/mo</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {(tab === 'overview' || tab === 'meals') && data && (
        <div className="profile-section">
          <div className="card profile-chart-card">
            <div className="card__title">
              <span className="card__title-icon" aria-hidden>🍽</span>
              Meal attendance — {year}
            </div>
            <div className="card__sub">Confirmed meals per month</div>
            <ChartBox type="bar" className="chart-box--sm" data={mealTrend} />
          </div>
        </div>
      )}

      {(tab === 'overview' || tab === 'expenses') && data && (
        <div className="grid-2 profile-widgets">
          <div className="card">
            <div className="card__title">Expense categories — {year}</div>
            <div className="card__sub">Where your personal spending went</div>
            {categoryEntries.length === 0 ? (
              <p className="profile-empty">No expenses logged this year.</p>
            ) : (
              <ChartBox type="doughnut" className="chart-box--sm" data={categoryChart} />
            )}
            <p className="profile-footnote">Year expenses: {fmt(data.yearExpenseTotal)}</p>
          </div>
          <div className="card">
            <div className="card__title">Recent expenses</div>
            <div className="card__sub">Latest items you logged</div>
            {data.recentExpenses.length === 0 ? (
              <p className="profile-empty">No recent expenses.</p>
            ) : (
              <ul className="profile-expense-list">
                {data.recentExpenses.map((e) => (
                  <li key={e.id}>
                    <div>
                      <span className="profile-expense-list__name">{e.itemName}</span>
                      <span className="profile-expense-list__meta">{e.category} · {e.monthKey}</span>
                    </div>
                    <strong>{fmt(e.price)}</strong>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/expenses" className="profile-link">Log expenses →</Link>
          </div>
        </div>
      )}
    </section>
  );
}
