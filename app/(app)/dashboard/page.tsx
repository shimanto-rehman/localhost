'use client';

import { useEffect, useState } from 'react';
import { fmt, monthLabel, memberColor } from '@/lib/utils';
import { MONTH_NAMES } from '@/lib/constants';
import { ChartBox } from '@/components/charts/ChartBox';
import { Avatar } from '@/components/ui/Avatar';
import { useApp } from '@/components/providers/AppProvider';

const BILL_LABELS: Record<string, string> = {
  fixedBucket: '🏠 Rent + Gas + Water + Service',
  electricity: '⚡ Electricity',
  meals: '🍽 Meals',
};

export default function DashboardPage() {
  const { apartment, members } = useApp();
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Record<string, unknown> | null>(null);
  const year = new Date().getFullYear();

  useEffect(() => {
    Promise.all([
      fetch(`/api/dashboard/year-summary?year=${year}`).then((r) => r.ok ? r.json() : null),
      fetch('/api/dashboard/current-month').then((r) => r.ok ? r.json() : null),
    ]).then(([s, c]) => {
      setSummary(s);
      setCurrentMonth(c);
    });
  }, [year]);

  const monthlyTotals = (summary?.monthlyTotals as { month: string; bills: number; meals: number; expenses: number }[]) || [];
  const monthLabels = monthlyTotals.map((m) => m.month.slice(5));
  const categoryTotals = summary?.categoryTotals as { fixed: number; optional: number; electricity: number; meals: number } | undefined;
  const personTotals = summary?.personTotals as Record<string, number> | undefined;
  const elecTrend = (summary?.electricityTrend as { month: string; amount: number }[]) || [];
  const gapTrend = (summary?.gapTrend as { month: string; gap: number }[]) || [];
  const memberExpenseTrend = summary?.memberExpenseTrend as Record<string, number[]> | undefined;

  type CalcResult = {
    id: string; name: string; photoUrl?: string; total: number;
    breakdown: { fixedBucket: number; electricity: number; meals: number; optional?: Record<string, number> };
    adjustments: { type: string; label: string; amount: number }[];
  };
  const calc = currentMonth?.calculation as { results: CalcResult[]; collectedTotal?: number } | null;

  const billManagerId = apartment?.billManagerId;
  const totalCollected = (calc?.collectedTotal as number) || calc?.results?.reduce((s, r) => s + r.total, 0) || 0;

  // Chart configs
  const monthlyChartData = {
    labels: monthLabels,
    datasets: [{
      label: 'Bills + Expenses',
      data: monthlyTotals.map((m) => m.bills + m.meals + m.expenses),
      borderColor: '#2dd4bf',
      backgroundColor: 'rgba(45, 212, 191, 0.15)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#2dd4bf',
      pointRadius: 4,
      borderWidth: 2.5,
    }],
  };

  const personChartData = {
    labels: members.map((m) => m.name),
    datasets: [{
      label: 'Year Total',
      data: members.map((m) => personTotals?.[m.id] || 0),
      backgroundColor: members.map((_, i) => memberColor(i) + 'cc'),
      borderColor: members.map((_, i) => memberColor(i)),
      borderWidth: 1,
      borderRadius: 10,
    }],
  };

  const categoryChartData = {
    labels: ['Fixed Costs', 'Optional', 'Electricity', 'Meals'],
    datasets: [{
      data: categoryTotals
        ? [categoryTotals.fixed, categoryTotals.optional, categoryTotals.electricity, categoryTotals.meals]
        : [0, 0, 0, 0],
      backgroundColor: ['#2dd4bfcc', '#14b8a6cc', '#38bdf8cc', '#a78bfacc'],
      borderColor: ['#2dd4bf', '#14b8a6', '#38bdf8', '#a78bfa'],
      borderWidth: 1,
    }],
  };

  const elecChartData = {
    labels: elecTrend.map((e) => e.month.slice(5)),
    datasets: [{
      label: 'Electricity',
      data: elecTrend.map((e) => e.amount),
      borderColor: '#5eead4',
      backgroundColor: 'rgba(94, 234, 212, 0.15)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#5eead4',
      pointRadius: 4,
      borderWidth: 2.5,
    }],
  };

  const expenseLabels = MONTH_NAMES.map((m) => m.slice(0, 3));
  const compareChartData = {
    labels: expenseLabels,
    datasets: members.map((m, i) => ({
      label: m.name,
      data: memberExpenseTrend?.[m.id] || Array(12).fill(0),
      borderColor: memberColor(i),
      backgroundColor: memberColor(i) + '22',
      pointBackgroundColor: memberColor(i),
      pointRadius: 4,
      borderWidth: 2.5,
      tension: 0.35,
      fill: false,
    })),
  };

  const gapChartData = {
    labels: gapTrend.map((g) => g.month.slice(5)),
    datasets: [{
      label: 'Rounding gap',
      data: gapTrend.map((g) => g.gap),
      backgroundColor: gapTrend.map((g) => g.gap > 0 ? 'rgba(45, 212, 191, 0.75)' : 'rgba(255,255,255,0.06)'),
      borderColor: gapTrend.map((g) => g.gap > 0 ? '#2dd4bf' : 'rgba(255,255,255,0.06)'),
      borderWidth: 1,
      borderRadius: 6,
    }],
  };

  const stats = [
    { label: 'Fixed Bucket / Month', value: fmt((summary?.fixedBucketTotal as number) || 0), sub: 'Rent + Gas + Water + Service' },
    { label: 'Active Members', value: String(members.length), sub: 'Flatmates registered' },
    { label: 'Bills This Year', value: String(Number(summary?.lockedMonthsCount) || 0), sub: `${year} · months logged` },
    { label: 'Year Gap (Ceiling)', value: fmt((summary?.yearGap as number) || 0), sub: `Ceiling rounding surplus` },
  ];

  return (
    <section className="page active">
      <div className="stats-row">
        {stats.map((s, i) => (
          <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className="stat-card__label">{s.label}</div>
            <div className="stat-card__value">{s.value}</div>
            <div className="stat-card__sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-stack">
        <div className="grid-2">
          <div className="card">
            <div className="card__title">
              <span className="card__title-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </span>
              Monthly Total Cost
            </div>
            <div className="card__sub">Full year overview — all bills + expenses combined</div>
            <ChartBox type="line" data={monthlyChartData} options={{ plugins: { legend: { display: false } } }} />
          </div>
          <div className="card">
            <div className="card__title">
              <span className="card__title-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                </svg>
              </span>
              Per-Person Contribution
            </div>
            <div className="card__sub">Cumulative share per member this year</div>
            <ChartBox type="bar" data={personChartData} options={{ plugins: { legend: { display: false } } }} />
          </div>
        </div>
        <div className="grid-2">
          <div className="card">
            <div className="card__title">
              <span className="card__title-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0 1 0 20" /><path d="M12 2a10 10 0 0 0 0 20" />
                </svg>
              </span>
              Bill Category Breakdown
            </div>
            <div className="card__sub">Yearly cost distribution by type</div>
            <ChartBox type="doughnut" data={categoryChartData} />
          </div>
          <div className="card">
            <div className="card__title">
              <span className="card__title-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </span>
              Electricity Trend
            </div>
            <div className="card__sub">Monthly electricity bills across the year</div>
            <ChartBox type="line" data={elecChartData} options={{ plugins: { legend: { display: false } } }} />
          </div>
        </div>
      </div>

      <div className="card card--spaced">
        <div className="card__title">
          <span className="card__title-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
            </svg>
          </span>
          Member Expense Contributions
        </div>
        <div className="card__sub">Monthly spending per flatmate — lowest spender sets the base</div>
        <div className="chart-box chart-box--tall">
          <ChartBox
            type="line"
            data={compareChartData}
            options={{
              plugins: {
                legend: {
                  display: true,
                  position: 'top' as const,
                  labels: { usePointStyle: true, padding: 14 },
                },
              },
            }}
          />
        </div>
      </div>

      <div className="section-head">
        <div className="section-head__title">Member Bills <span>Current Month</span></div>
        <span className="chip chip--accent">{monthLabel(new Date())}</span>
      </div>

      {!calc?.results?.length ? (
        <div className="grid-3">
          <div className="empty" style={{ gridColumn: '1/-1' }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
              <polyline points="13 2 13 9 20 9" />
            </svg>
            <h3>No bill for {monthLabel(new Date())}</h3>
            <p>Enter the electricity bill under <strong>Monthly Bills</strong> to unlock calculations.</p>
          </div>
        </div>
      ) : (
        <div className="grid-3">
          {calc.results.map((r, i) => {
            const pct = totalCollected > 0 ? Math.round(r.total / totalCollected * 100) : 0;
            return (
              <div key={r.id} className="member-card" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="member-card__head">
                  <Avatar name={r.name} photoUrl={r.photoUrl} index={i} size="lg" />
                  <div>
                    <div className="member-card__name">
                      {r.name}
                      {billManagerId === r.id && <span className="manager-badge">Bill Manager</span>}
                    </div>
                    <div className="member-card__total">{fmt(r.total)} <small>/ month</small></div>
                    <span className="chip chip--accent" style={{ marginTop: 8, display: 'inline-block' }}>{pct}% share</span>
                  </div>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
                {Object.entries(r.breakdown).map(([k, v]) => {
                  if (k === 'optional' || typeof v !== 'number') return null;
                  return (
                    <div key={k} className="bill-row">
                      <span className="bill-row__label">{BILL_LABELS[k] || k}</span>
                      <span className="bill-row__value">{fmt(v)}</span>
                    </div>
                  );
                })}
                {r.breakdown.optional && Object.entries(r.breakdown.optional).map(([name, v]) => (
                  <div key={name} className="bill-row">
                    <span className="bill-row__label">{name}</span>
                    <span className="bill-row__value">{fmt(v as number)}</span>
                  </div>
                ))}
                {r.adjustments?.map((a, ai) => (
                  <div key={ai} className="bill-row bill-row--adj">
                    <span className="bill-row__label">{a.type === 'lend' ? 'Lent' : 'Borrowed'} · {a.label}</span>
                    <span className={`bill-row__value bill-row__value--${a.type === 'lend' ? 'lend' : 'borrow'}`}>
                      {a.type === 'lend' ? '+' : '−'}{fmt(Number(a.amount)).slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div className="card card--spaced-top">
        <div className="card__title">
          <span className="card__title-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </span>
          Rounding Gap (Ceiling Split)
        </div>
        <div className="card__sub">Extra collected vs actual bill — from rounding per-head costs up</div>
        <div className="gap-stat">
          <span className="gap-stat__year">{fmt((summary?.yearGap as number) || 0)}</span>
          <span className="gap-stat__hint">total gap this year</span>
        </div>
        <ChartBox
          type="bar"
          className="chart-box--sm chart-box--gap"
          data={gapChartData}
          options={{ plugins: { legend: { display: false } } }}
        />
      </div>
    </section>
  );
}
