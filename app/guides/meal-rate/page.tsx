import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME, SITE_URL } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Mess Meal Rate Calculator — How to Calculate Per-Meal Cost | LocalHost',
  description:
    'Learn how to calculate the per-meal rate for your mess or shared apartment. Step-by-step formula: total food expenses ÷ total confirmed meals = meal rate. মেস মিল রেট হিসাব।',
  alternates: {
    canonical: `${SITE_URL}/guides/meal-rate`,
    languages: {
      en: `${SITE_URL}/guides/meal-rate`,
      bn: `${SITE_URL}/guides/bn/meal-rate`,
    },
  },
};

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Calculate Mess Meal Rate (Per-Meal Cost)',
  description:
    'Step-by-step guide to calculating the per-meal rate for a shared apartment or mess in Bangladesh. Includes the formula, worked example, and how LocalHost automates it.',
  author: { '@type': 'Organization', name: SITE_NAME },
  publisher: { '@type': 'Organization', name: SITE_NAME },
  inLanguage: 'en',
  url: `${SITE_URL}/guides/meal-rate`,
  datePublished: '2025-01-01',
  dateModified: '2026-06-01',
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the mess meal rate formula?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Meal Rate = Total meal fund (shopping + food expenses) ÷ Total confirmed meals. For example: ৳18,000 food spend ÷ 600 total meals = ৳30 per meal.',
      },
    },
    {
      '@type': 'Question',
      name: 'What expenses go into the meal fund?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'All grocery shopping for the mess kitchen plus any expense logged under the "Food" category (e.g. a flatmate buying rice or oil and getting reimbursed). Gas, electricity, and household items are typically NOT included in the meal fund.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do you track individual meal counts?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Each flatmate marks their meals on a weekly checklist — breakfast, lunch, or dinner for each day. At the end of the month, the confirmed meal counts are totalled. LocalHost has a built-in weekly checklist for this.',
      },
    },
    {
      '@type': 'Question',
      name: 'What happens if someone skips meals for a week?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Their meal count is simply lower, so they pay less. The meal rate stays the same — only the cost for that person changes (fewer meals × rate). Everyone benefits from an accurate checklist.',
      },
    },
  ],
};

export default function MealRateGuidePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <article className="guide" lang="en">
        <header className="guide__header">
          <div className="guide__badge">Meal Rate Guide</div>
          <h1>Mess Meal Rate Calculator</h1>
          <p className="guide__lead">
            How to calculate the per-meal cost for your shared apartment or mess — the exact formula,
            a worked example, and how to avoid the common mistakes that cause disputes every month.
          </p>
          <p className="guide__meta">
            Also in: <Link href="/guides/bn/meal-rate">বাংলায় পড়ুন — মেস মিল রেট হিসাব</Link>
          </p>
        </header>

        <section>
          <h2>The Formula</h2>
          <p>
            The per-meal rate for any shared apartment or mess is calculated as:
          </p>
          <div className="guide__formula-box">
            <strong>Meal Rate = Total Meal Fund ÷ Total Confirmed Meals</strong>
            <br />
            <em>Example: ৳18,000 ÷ 600 meals = ৳30 per meal</em>
          </div>
          <p>
            Each member then pays: <strong>Meal Rate × Their Meal Count</strong>.
          </p>
          <p>
            If Shimanto ate 45 meals at ৳30/meal, their meal cost is <strong>৳1,350</strong>.
            If Tauqir ate 62 meals, theirs is <strong>৳1,860</strong>. Both use the same rate — it&apos;s fair.
          </p>
        </section>

        <section>
          <h2>What Counts as the Meal Fund?</h2>
          <p>
            The meal fund is the total amount spent on food for the shared kitchen. This typically includes:
          </p>
          <ul>
            <li><strong>Grocery shopping</strong> — rice, dal, vegetables, oil, spices, fish, meat</li>
            <li><strong>Personal food expense claims</strong> — when a flatmate buys groceries and logs it under the &ldquo;Food&rdquo; category to get reimbursed</li>
          </ul>
          <p>The meal fund does <strong>not</strong> normally include:</p>
          <ul>
            <li>Gas or cooking fuel (that&apos;s a fixed utility bill)</li>
            <li>Electricity (separate bill)</li>
            <li>Cleaning supplies, kitchen equipment, or household items</li>
            <li>Personal food bought outside the shared kitchen</li>
          </ul>
          <p>
            LocalHost automatically pools all expenses marked as &ldquo;Food&rdquo; into the meal fund. Other
            categories (Groceries, Utilities, Household, etc.) stay separate.
          </p>
        </section>

        <section>
          <h2>How to Track Meal Counts Accurately</h2>
          <p>
            The meal count is where most messes go wrong. Common (bad) approaches:
          </p>
          <ul>
            <li>Estimating &mdash; &ldquo;I ate about 50 meals&rdquo; (inaccurate, causes arguments)</li>
            <li>Assuming everyone ate the same (unfair to people who were away)</li>
            <li>Only tracking dinner and ignoring breakfast/lunch</li>
          </ul>
          <p>
            <strong>The right approach:</strong> Mark each meal individually on a daily or weekly checklist.
            At the end of the month, count confirmed meals for each person.
          </p>
          <p>
            LocalHost provides a weekly meal checklist. For each week, every flatmate marks which meals
            (Breakfast, Lunch, Dinner) they had on each day. The month-end totals are calculated automatically.
          </p>
        </section>

        <section>
          <h2>Worked Example — June 2026</h2>
          <h3>Step 1: Calculate total meal fund</h3>
          <table className="guide__table">
            <thead>
              <tr><th>Item</th><th>Amount</th></tr>
            </thead>
            <tbody>
              <tr><td>Week 1 grocery shopping</td><td>৳4,200</td></tr>
              <tr><td>Week 2 grocery shopping</td><td>৳3,800</td></tr>
              <tr><td>Week 3 grocery shopping</td><td>৳4,500</td></tr>
              <tr><td>Week 4 grocery shopping</td><td>৳3,900</td></tr>
              <tr><td>Shimanto: rice (Food expense)</td><td>৳1,200</td></tr>
              <tr><td>Tauqir: oil + spices (Food expense)</td><td>৳400</td></tr>
              <tr><td className="guide__table-total"><strong>Total meal fund</strong></td><td className="guide__table-total"><strong>৳18,000</strong></td></tr>
            </tbody>
          </table>

          <h3>Step 2: Count confirmed meals</h3>
          <table className="guide__table">
            <thead>
              <tr><th>Member</th><th>Meals</th></tr>
            </thead>
            <tbody>
              <tr><td>Shimanto</td><td>45</td></tr>
              <tr><td>Tauqir</td><td>62</td></tr>
              <tr><td>Parvez</td><td>58</td></tr>
              <tr><td>Rafi</td><td>55</td></tr>
              <tr><td className="guide__table-total"><strong>Total confirmed meals</strong></td><td className="guide__table-total"><strong>220</strong></td></tr>
            </tbody>
          </table>

          <h3>Step 3: Calculate meal rate</h3>
          <div className="guide__formula-box">
            ৳18,000 ÷ 220 meals = <strong>৳81.82 per meal</strong>
          </div>

          <h3>Step 4: Each member&apos;s meal bill</h3>
          <table className="guide__table">
            <thead>
              <tr><th>Member</th><th>Meals</th><th>Rate</th><th>Meal Bill</th></tr>
            </thead>
            <tbody>
              <tr><td>Shimanto</td><td>45</td><td>৳81.82</td><td>৳3,682</td></tr>
              <tr><td>Tauqir</td><td>62</td><td>৳81.82</td><td>৳5,073</td></tr>
              <tr><td>Parvez</td><td>58</td><td>৳81.82</td><td>৳4,746</td></tr>
              <tr><td>Rafi</td><td>55</td><td>৳81.82</td><td>৳4,500</td></tr>
              <tr><td className="guide__table-total"><strong>Total</strong></td><td>220</td><td></td><td className="guide__table-total"><strong>৳18,001 ≈ ৳18,000 ✓</strong></td></tr>
            </tbody>
          </table>
          <p>
            The totals check out (small rounding). The fund is fully distributed among members based on
            actual meals eaten.
          </p>
        </section>

        <section>
          <h2>Common Mistakes</h2>
          <h3>1. Not including food expense claims in the fund</h3>
          <p>
            If Shimanto buys ৳1,200 of rice for the mess kitchen and doesn&apos;t log it, the meal fund is
            artificially low — the meal rate looks cheaper, but Shimanto is effectively subsidising everyone.
            Always log food expenses and include them in the fund.
          </p>
          <h3>2. Rounding the rate before multiplying</h3>
          <p>
            If ৳18,000 ÷ 220 = ৳81.818…, don&apos;t round to ৳82 before multiplying. Apply the full precision
            rate to each member and round only the final bill. LocalHost handles this automatically.
          </p>
          <h3>3. Counting meals someone claimed but didn&apos;t eat</h3>
          <p>
            Meals should only be confirmed if they were actually eaten. The Bill Manager or Admin can
            edit the checklist before finalising. LocalHost locks meal records when the month is locked.
          </p>
        </section>

        <section>
          <h2>Automate It with LocalHost</h2>
          <p>
            LocalHost does all of this automatically:
          </p>
          <ol>
            <li>Members mark meals on the weekly checklist (Breakfast / Lunch / Dinner per day)</li>
            <li>The Bill Manager adds grocery shopping entries as expenses in the &ldquo;Food&rdquo; category</li>
            <li>When the month is finalized, LocalHost sums the food expenses and confirmed meals</li>
            <li>The per-meal rate is calculated and each member&apos;s meal bill appears in their breakdown</li>
            <li>The month is locked — the rate and counts are frozen</li>
          </ol>
          <p>
            <Link href="/login">Register your apartment</Link> to try it for free. No credit card needed.
          </p>
        </section>

        <section>
          <h2>Frequently Asked Questions</h2>

          <details className="guide__faq-item">
            <summary>What if the meal fund is zero but people still ate?</summary>
            <p>
              If no food expenses were logged, the meal rate is ৳0 — which means the month&apos;s grocery
              shopping wasn&apos;t recorded. Always make sure grocery expenses are logged before finalising.
              LocalHost will warn you if meal expenses are missing.
            </p>
          </details>

          <details className="guide__faq-item">
            <summary>Can we set a fixed meal rate instead of calculating?</summary>
            <p>
              Yes. LocalHost supports a fixed meal rate (e.g. a flat ৳30/meal regardless of actual spending).
              This simplifies tracking but means some months you over- or under-recover the food expenses.
              Most apartments use the dynamic calculated rate for fairness.
            </p>
          </details>

          <details className="guide__faq-item">
            <summary>What if someone was away for a whole week?</summary>
            <p>
              They simply mark zero meals for those days. Their meal count is lower, so their meal bill
              is lower. The rate itself doesn&apos;t change — only the fund is divided by actual total meals.
            </p>
          </details>

          <details className="guide__faq-item">
            <summary>How are Breakfast, Lunch, and Dinner treated?</summary>
            <p>
              All meal types count as one &ldquo;meal&rdquo; each in the default configuration. If your mess
              only shares dinner, you can configure LocalHost to track only dinner. The meal rate
              calculation uses whichever types you enable.
            </p>
          </details>
        </section>

        <nav className="guide__nav">
          <Link href="/guides">← Full user guide</Link>
          <Link href="/">Back to LocalHost</Link>
          <Link href="/guides/split-apartment-bills">How to split apartment bills →</Link>
        </nav>
      </article>
    </>
  );
}
