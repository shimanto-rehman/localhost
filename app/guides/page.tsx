import type { Metadata } from 'next';
import Link from 'next/link';
import { GuideManualShell } from '@/components/guides/GuideManualShell';
import { SITE_NAME, SITE_URL } from '@/lib/constants';

export const metadata: Metadata = {
  title: `User Guide — How to Use ${SITE_NAME}`,
  description:
    'Complete user manual for LocalHost: monthly bills, meal tracking, expenses, dashboard, import, settings, roles, and how every calculation works.',
  alternates: { canonical: `${SITE_URL}/guides` },
};

const TOC = [
  { id: 'overview', label: 'What is LocalHost?' },
  { id: 'getting-started', label: 'Getting started' },
  { id: 'roles', label: 'Roles & permissions' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'bills', label: 'Monthly bills' },
  { id: 'bills-math', label: 'How bills are calculated' },
  { id: 'meals', label: 'Meal management' },
  { id: 'meals-math', label: 'How meal costs work' },
  { id: 'expenses', label: 'Shared expenses' },
  { id: 'expenses-math', label: 'Expense settlement' },
  { id: 'import', label: 'Import & export' },
  { id: 'settings', label: 'Configuration' },
  { id: 'profile', label: 'My profile' },
  { id: 'tips', label: 'Tips & FAQ' },
] as const;

export default function UserGuidePage() {
  return (
    <GuideManualShell toc={[...TOC]}>
      <header className="manual__hero">
        <div className="manual__hero-badge">Complete user manual</div>
        <h1>How LocalHost works</h1>
        <p className="manual__hero-lead">
          Everything you need to run a shared apartment or mess — from registering your flat to
          locking the monthly bill. This guide explains each feature, how to use it, and exactly how
          the numbers are calculated.
        </p>
        <div className="manual__quick-grid">
          <a href="#bills" className="manual__quick-card">
            <div className="manual__quick-card-icon">📋</div>
            <div className="manual__quick-card-title">Monthly bills</div>
            <div className="manual__quick-card-desc">Rent, electricity, optional costs &amp; adjustments</div>
          </a>
          <a href="#meals" className="manual__quick-card">
            <div className="manual__quick-card-icon">🍽</div>
            <div className="manual__quick-card-title">Meals</div>
            <div className="manual__quick-card-desc">Weekly checklist, guest meals &amp; meal rate</div>
          </a>
          <a href="#expenses" className="manual__quick-card">
            <div className="manual__quick-card-icon">🛒</div>
            <div className="manual__quick-card-title">Expenses</div>
            <div className="manual__quick-card-desc">Shared purchases with carry-forward settlement</div>
          </a>
          <a href="#dashboard" className="manual__quick-card">
            <div className="manual__quick-card-icon">📊</div>
            <div className="manual__quick-card-title">Dashboard</div>
            <div className="manual__quick-card-desc">Year charts &amp; current-month overview</div>
          </a>
        </div>
      </header>

      {/* ── Overview ── */}
      <section id="overview" className="manual__section">
        <div className="manual__section-head">
          <div className="manual__section-icon">🏠</div>
          <div>
            <h2>What is LocalHost?</h2>
            <p className="manual__section-sub">One app for your whole apartment&apos;s finances</p>
          </div>
        </div>
        <p>
          LocalHost helps flatmates and mess members track <strong>monthly bills</strong>,{' '}
          <strong>shared meals</strong>, and <strong>household expenses</strong> in one place. Each
          apartment has its own workspace. Members sign in with a personal password; the apartment
          itself has a separate login for registration and admin access.
        </p>
        <p>Each month you typically:</p>
        <ol>
          <li>Log shared expenses and meal shopping throughout the month</li>
          <li>Mark who ate which meals on the weekly checklist</li>
          <li>Enter the electricity bill and lock the month when ready</li>
          <li>See each member&apos;s fair share — rounded up per head so the total always covers costs</li>
        </ol>
        <div className="manual__pill-row">
          <span className="manual__pill">Dashboard</span>
          <span className="manual__pill">Monthly Bills</span>
          <span className="manual__pill">Meals</span>
          <span className="manual__pill">Expenses</span>
          <span className="manual__pill">Import</span>
          <span className="manual__pill">Settings</span>
          <span className="manual__pill">Profile</span>
        </div>
      </section>

      {/* ── Getting started ── */}
      <section id="getting-started" className="manual__section">
        <div className="manual__section-head">
          <div className="manual__section-icon">🚀</div>
          <div>
            <h2>Getting started</h2>
            <p className="manual__section-sub">From registration to your first locked month</p>
          </div>
        </div>
        <ol className="manual__steps">
          <li className="manual__step">
            <span className="manual__step-num">1</span>
            <p>
              <strong>Register your apartment</strong> on the{' '}
              <Link href="/login">sign-in page</Link>. Choose a name, apartment password, and add
              your first members.
            </p>
          </li>
          <li className="manual__step">
            <span className="manual__step-num">2</span>
            <p>
              <strong>Configure costs</strong> in Settings → Costs: fixed items (rent, gas, internet),
              optional add-ons (Wi‑Fi upgrade, parking), and who is opted in to each optional cost.
            </p>
          </li>
          <li className="manual__step">
            <span className="manual__step-num">3</span>
            <p>
              <strong>Set up meals</strong> in Settings → Meals: how many meals per day (e.g. Lunch +
              Dinner), meal names, guest meal mode, and each member&apos;s meal plan.
            </p>
          </li>
          <li className="manual__step">
            <span className="manual__step-num">4</span>
            <p>
              <strong>During the month</strong>, members log expenses, mark meals on the checklist,
              and add meal shopping. Today&apos;s meals are selected by default — tap to opt out if
              someone skips.
            </p>
          </li>
          <li className="manual__step">
            <span className="manual__step-num">5</span>
            <p>
              <strong>End of month</strong>: Bill Manager enters electricity on the Bills page,
              reviews breakdowns, records payments, and locks the month. Meals can be finalized
              separately on the Meals page.
            </p>
          </li>
        </ol>
        <div className="manual__callout manual__callout--tip">
          <strong>Tip:</strong> The checklist opens on the <em>current week</em> automatically, so
          you don&apos;t have to scroll from week one every time you open the app.
        </div>
      </section>

      {/* ── Roles ── */}
      <section id="roles" className="manual__section">
        <div className="manual__section-head">
          <div className="manual__section-icon">👥</div>
          <div>
            <h2>Roles &amp; permissions</h2>
            <p className="manual__section-sub">Who can do what in your apartment</p>
          </div>
        </div>
        <table className="manual__table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Typical responsibilities</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Admin</strong></td>
              <td>Full access: members, settings, danger zone, all bill and meal actions</td>
            </tr>
            <tr>
              <td><strong>Bill Manager</strong></td>
              <td>Enters electricity, locks months, manages adjustments, payment info visible on bills</td>
            </tr>
            <tr>
              <td><strong>Member</strong></td>
              <td>Own profile, meal plan, expenses; checklist editing if granted permission</td>
            </tr>
          </tbody>
        </table>
        <p>
          Permissions are configurable under Settings. For example,{' '}
          <code>manage_meal_checklist</code> controls who can tick meals for other members.{' '}
          <code>lock_bills</code> controls who can finalize a month.
        </p>
      </section>

      {/* ── Dashboard ── */}
      <section id="dashboard" className="manual__section">
        <div className="manual__section-head">
          <div className="manual__section-icon">📊</div>
          <div>
            <h2>Dashboard</h2>
            <p className="manual__section-sub">Bird&apos;s-eye view of the year</p>
          </div>
        </div>
        <p>
          The dashboard shows <strong>current-month bill breakdown</strong> per member and a set of
          year-level charts: monthly totals, per-person yearly spend, category breakdown, electricity
          trend, rounding gap over time, and member expense comparison.
        </p>
        <h3>How to use it</h3>
        <ul>
          <li>Open Dashboard from the sidebar — it loads the current calendar month by default</li>
          <li>Use stat tiles at the top for fixed bucket total, active members, locked months, and year gap</li>
          <li>Charts help spot months where electricity spiked or one member carried more expenses</li>
        </ul>
        <p>
          Dashboard numbers come from the same bill and expense engines described below — it is a
          read-only summary, not a separate calculation.
        </p>
      </section>

      {/* ── Bills ── */}
      <section id="bills" className="manual__section">
        <div className="manual__section-head">
          <div className="manual__section-icon">📋</div>
          <div>
            <h2>Monthly bills</h2>
            <p className="manual__section-sub">The main monthly settlement page</p>
          </div>
        </div>
        <p>
          The Bills page is where each member&apos;s <strong>total monthly share</strong> is calculated
          and displayed. Use the month picker to browse previous months.
        </p>
        <h3>What you can do</h3>
        <ul>
          <li><strong>Enter electricity</strong> — required before the bill can be calculated (Bill Manager)</li>
          <li><strong>View breakdown</strong> — fixed rent share, electricity, optional costs, meals, adjustments</li>
          <li><strong>Lend / borrow adjustments</strong> — one-off corrections (e.g. &ldquo;paid extra for repair&rdquo;)</li>
          <li><strong>Track payments</strong> — mark who has paid their share</li>
          <li><strong>Lock month</strong> — freezes the bill snapshot; no further edits to that month&apos;s calculation inputs</li>
          <li><strong>Bill Manager payment info</strong> — members can see how to pay (bKash, bank, etc.)</li>
        </ul>
        <div className="manual__callout">
          A month shows a <strong>Finalized</strong> badge when locked. Locked months use saved snapshots
          so changing settings later does not rewrite history.
        </div>
      </section>

      {/* ── Bills math ── */}
      <section id="bills-math" className="manual__section">
        <div className="manual__section-head">
          <div className="manual__section-icon">🧮</div>
          <div>
            <h2>How bills are calculated</h2>
            <p className="manual__section-sub">Transparent formulas — no hidden magic</p>
          </div>
        </div>
        <p>Each member&apos;s bill is the sum of several parts, plus any adjustments:</p>
        <div className="manual__formula">
          <strong>Member total</strong> = Fixed share + Optional costs + Electricity share + Variable costs + Meals + Adjustments
        </div>

        <h3>1. Fixed bucket (rent &amp; fixed utilities)</h3>
        <p>
          All fixed costs marked <em>in fixed bucket</em> (typically rent, gas, internet) are summed.
          Members with a <strong>custom rent amount</strong> in Settings → Rent pay exactly that; the
          remainder is split equally among members without a custom amount.
        </p>
        <div className="manual__formula">
          Free member share = round( (Fixed bucket − Σ custom rents) ÷ number of free members )
        </div>

        <h3>2. Optional costs</h3>
        <p>
          Each optional cost (e.g. parking, premium Wi‑Fi) is split only among members who are{' '}
          <strong>opted in</strong>. The per-person amount is rounded <em>up</em> to the nearest whole taka.
        </p>
        <div className="manual__formula">
          Optional per head = <code>ceil(cost ÷ opted-in count)</code>
        </div>

        <h3>3. Electricity</h3>
        <p>Split equally among all active members, rounded up per head:</p>
        <div className="manual__formula">
          Electricity per head = <code>ceil(electricity bill ÷ active members)</code>
        </div>

        <h3>4. Meals</h3>
        <p>
          Meal costs are calculated on the Meals page (see below) and plugged into each member&apos;s
          bill automatically when the month is calculated.
        </p>

        <h3>5. Adjustments (lend / borrow)</h3>
        <div className="manual__formula">
          Adjustment delta = Σ lend amounts − Σ borrow amounts
        </div>
        <p>Lend increases what a member owes; borrow decreases it.</p>

        <h3>6. Rounding gap</h3>
        <p>
          Because each line uses <code>ceil</code> per head, the sum of member totals may slightly
          exceed the actual bills. The difference is shown as the <strong>gap</strong> (surplus collected).
          This is normal and keeps every share a whole number.
        </p>
        <p>
          <Link href="/guides/split-apartment-bills">Read the full bill-splitting guide with worked example →</Link>
        </p>
      </section>

      {/* ── Meals ── */}
      <section id="meals" className="manual__section">
        <div className="manual__section-head">
          <div className="manual__section-icon">🍽</div>
          <div>
            <h2>Meal management</h2>
            <p className="manual__section-sub">Checklist, shopping, guests &amp; finalization</p>
          </div>
        </div>

        <h3>My meal plan</h3>
        <p>
          Each member chooses which meal slots they participate in (e.g. only Dinner). You are only
          billed for slots you are enrolled in. Change this on the Meals page or in Settings → Meals.
        </p>

        <h3>Weekly checklist</h3>
        <ul>
          <li>Navigate weeks with the arrow buttons — opens on the <strong>current week</strong> by default</li>
          <li>Each cell is a meal slot (Lunch, Dinner, etc.) for that member and day</li>
          <li>Green check = confirmed meal; grey letter = not confirmed</li>
          <li><strong>Today:</strong> enrolled meals are confirmed automatically — click to withdraw if someone skips</li>
          <li>Future days cannot be edited</li>
          <li>Dash (–) means the member is not on that meal plan</li>
        </ul>

        <h3>Meal shopping</h3>
        <p>
          Add grocery items bought for the shared kitchen. These feed into the meal fund together with
          Food-category expenses from the Expenses page.
        </p>

        <h3>Guest meals</h3>
        <p>
          Below the checklist, pick a day, choose a <strong>host member</strong>, and set guest counts
          per meal slot. Two modes (Settings → Meals):
        </p>
        <ul>
          <li><strong>Equal split</strong> — guest meal cost shared among all active members</li>
          <li><strong>Host pays</strong> — only the host member pays for their guests</li>
        </ul>
        <p>Guest meals count toward the total meal pool when calculating the per-meal rate.</p>

        <h3>Finalize meals</h3>
        <p>
          When the month is done, finalize meals to lock counts and rates. After finalization the
          checklist and guest counts cannot be changed.
        </p>
      </section>

      {/* ── Meals math ── */}
      <section id="meals-math" className="manual__section">
        <div className="manual__section-head">
          <div className="manual__section-icon">📐</div>
          <div>
            <h2>How meal costs work</h2>
            <p className="manual__section-sub">Meal fund, rate, and per-member charge</p>
          </div>
        </div>

        <h3>Meal fund</h3>
        <p>The pool of money used to calculate the rate:</p>
        <div className="manual__formula">
          Meal fund = Food-category expenses + Meal shopping entries
        </div>

        <h3>Meal rate</h3>
        <p>Two modes (Settings → Meals):</p>
        <ul>
          <li><strong>Auto rate</strong> — calculated from the fund divided by total meals</li>
          <li><strong>Fixed rate</strong> — admin sets a flat ৳/meal regardless of spending</li>
        </ul>
        <div className="manual__formula">
          Auto rate = Meal fund ÷ (confirmed member meals + guest meals)
        </div>
        <p>Each member meal cost:</p>
        <div className="manual__formula">
          Member meal bill = <code>ceil(rate × own meal count)</code> + guest meal charge
        </div>
        <p>
          <strong>Net</strong> on the meal summary = meal bill minus what that member contributed to
          the fund (their Food expenses + shopping entries).
        </p>
        <p>
          <Link href="/guides/meal-rate">Full meal rate guide with worked example →</Link>
        </p>
      </section>

      {/* ── Expenses ── */}
      <section id="expenses" className="manual__section">
        <div className="manual__section-head">
          <div className="manual__section-icon">🛒</div>
          <div>
            <h2>Shared expenses</h2>
            <p className="manual__section-sub">Track who bought what for the house</p>
          </div>
        </div>
        <p>
          The Expenses page lets each member log items they purchased for the apartment: groceries,
          utilities, transport, household items, and more. Categories include Food, Groceries, Utilities,
          Transport, Household, Entertainment, Medical, and Other.
        </p>
        <h3>How to use it</h3>
        <ul>
          <li>Select the month with the month navigator</li>
          <li>Add items with name, price, category, and optional date</li>
          <li>View per-member totals and category breakdown</li>
          <li><strong>Food</strong> items also flow into the meal fund automatically</li>
        </ul>
        <p>
          Expenses are separate from the monthly Bills page — they use a carry-forward settlement
          model described below. They do not directly add to the rent/electricity bill unless the item
          is in a category that feeds meals (Food).
        </p>
      </section>

      {/* ── Expenses math ── */}
      <section id="expenses-math" className="manual__section">
        <div className="manual__section-head">
          <div className="manual__section-icon">⚖️</div>
          <div>
            <h2>Expense settlement</h2>
            <p className="manual__section-sub">Carry-forward between months</p>
          </div>
        </div>
        <p>
          Expenses use a <strong>lowest-spender base</strong> model. The member who spent the least
          (including any balance carried from last month) is the reference; others owe the difference
          forward.
        </p>
        <div className="manual__formula">
          Grand total = This month&apos;s spend + Carried forward from last month<br />
          Base = minimum grand total across all members<br />
          Extra = max(0, grand total − base)<br />
          Forward out = extra → becomes next month&apos;s carry-in
        </div>
        <h3>Example</h3>
        <table className="manual__table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Month spend</th>
              <th>Carried</th>
              <th>Grand total</th>
              <th>Extra (forwards)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Ali</td>
              <td>৳2,000</td>
              <td>৳0</td>
              <td>৳2,000</td>
              <td>৳500</td>
            </tr>
            <tr>
              <td>Sara</td>
              <td>৳1,800</td>
              <td>৳0</td>
              <td>৳1,800</td>
              <td>৳300</td>
            </tr>
            <tr>
              <td>Rafi</td>
              <td>৳1,500</td>
              <td>৳0</td>
              <td>৳1,500 (base)</td>
              <td>৳0</td>
            </tr>
          </tbody>
        </table>
        <p>
          Rafi spent the least, so base = ৳1,500. Ali forwards ৳500 and Sara forwards ৳300 into the
          next month. Over time this balances who has been buying more for the house.
        </p>
      </section>

      {/* ── Import ── */}
      <section id="import" className="manual__section">
        <div className="manual__section-head">
          <div className="manual__section-icon">📥</div>
          <div>
            <h2>Import &amp; export</h2>
            <p className="manual__section-sub">Bulk data via Excel</p>
          </div>
        </div>
        <h3>Import</h3>
        <ol>
          <li>Download the Excel template from the Import page</li>
          <li>Fill in members, expenses, meals, and bill data for a month</li>
          <li>Upload the file (.xlsx, max 10 MB)</li>
          <li>Review validation results — fix any errors and re-upload if needed</li>
        </ol>
        <h3>Export</h3>
        <p>Export all apartment data for backup or migration. Settings → Backup also offers JSON export/restore.</p>
      </section>

      {/* ── Settings ── */}
      <section id="settings" className="manual__section">
        <div className="manual__section-head">
          <div className="manual__section-icon">⚙️</div>
          <div>
            <h2>Configuration</h2>
            <p className="manual__section-sub">Settings tabs explained</p>
          </div>
        </div>
        <table className="manual__table">
          <thead>
            <tr>
              <th>Tab</th>
              <th>What you configure</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Members</strong></td>
              <td>Add/remove members, roles, passwords, photos, payment methods</td>
            </tr>
            <tr>
              <td><strong>Costs</strong></td>
              <td>Fixed &amp; optional costs, per-member opt-in for optional items</td>
            </tr>
            <tr>
              <td><strong>Meals</strong></td>
              <td>Meals per day, names, week start day, rate override, guest meal mode, member meal slots</td>
            </tr>
            <tr>
              <td><strong>Rent</strong></td>
              <td>Custom fixed rent per member (remainder splits among others)</td>
            </tr>
            <tr>
              <td><strong>Activity</strong></td>
              <td>Audit log of important changes</td>
            </tr>
            <tr>
              <td><strong>Backup</strong></td>
              <td>JSON export and restore</td>
            </tr>
            <tr>
              <td><strong>Danger</strong></td>
              <td>Reset bills/meals/all data or delete apartment (irreversible)</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* ── Profile ── */}
      <section id="profile" className="manual__section">
        <div className="manual__section-head">
          <div className="manual__section-icon">👤</div>
          <div>
            <h2>My profile</h2>
            <p className="manual__section-sub">Personal year overview</p>
          </div>
        </div>
        <p>
          Your profile shows a personal dashboard: bills paid across the year, meal participation,
          expense totals, charts, and a snapshot of the current month. Edit your name, photo, and
          password from the profile modal.
        </p>
      </section>

      {/* ── Tips & FAQ ── */}
      <section id="tips" className="manual__section">
        <div className="manual__section-head">
          <div className="manual__section-icon">💡</div>
          <div>
            <h2>Tips &amp; FAQ</h2>
            <p className="manual__section-sub">Common questions answered</p>
          </div>
        </div>

        <details className="guide__faq-item">
          <summary>Why do member totals sometimes add up to more than the actual bills?</summary>
          <p>
            LocalHost rounds each share up to the nearest whole taka (ceil per head). The small
            surplus is shown as the rounding gap. This avoids awkward fractional amounts when collecting
            cash.
          </p>
        </details>

        <details className="guide__faq-item">
          <summary>Can I change settings after locking a month?</summary>
          <p>
            Yes, but locked months keep their saved snapshot. Changing rent or optional costs affects
            future months and unlocked months only.
          </p>
        </details>

        <details className="guide__faq-item">
          <summary>What if someone forgets to mark meals?</summary>
          <p>
            Today&apos;s meals default to confirmed for enrolled slots. For past days, an admin or
            Bill Manager with checklist permission can still mark meals before finalization.
          </p>
        </details>

        <details className="guide__faq-item">
          <summary>Do Food expenses count twice (meals and expenses)?</summary>
          <p>
            Food expenses feed the meal fund for rate calculation. They also appear on the Expenses
            page for carry-forward settlement. These are two different systems — meals affect the
            monthly bill; expenses track who bought what over time.
          </p>
        </details>

        <details className="guide__faq-item">
          <summary>How do I switch between dark and light mode?</summary>
          <p>
            Use the theme toggle on the landing page nav or in the app top bar. Your preference is
            saved in the browser.
          </p>
        </details>

        <div className="manual__footer-cta">
          <h3>Ready to try it?</h3>
          <p>Register your apartment free — no credit card required.</p>
          <Link href="/login" className="lp-btn lp-btn--primary lp-btn--lg">
            Get started
          </Link>
        </div>
      </section>
    </GuideManualShell>
  );
}
