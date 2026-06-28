import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME, SITE_URL } from '@/lib/constants';

const PAGE_URL = `${SITE_URL}/guides/split-apartment-bills`;
const BN_URL = `${SITE_URL}/guides/bn/split-apartment-bills`;

export const metadata: Metadata = {
  title: 'How to Split Apartment Bills Fairly Between Flatmates',
  description:
    'A practical guide to splitting rent, electricity, gas, water, and meal costs in a shared apartment or mess — with formulas, examples, and a free calculator.',
  alternates: {
    canonical: PAGE_URL,
    languages: { en: PAGE_URL, bn: BN_URL },
  },
  openGraph: {
    type: 'article',
    url: PAGE_URL,
    title: 'How to Split Apartment Bills Fairly Between Flatmates',
    description:
      'Formulas and examples for splitting rent, utilities, and meal costs in a shared apartment or mess.',
  },
};

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Split Apartment Bills Fairly Between Flatmates',
  description:
    'A practical guide to splitting rent, electricity, gas, water, and meal costs in a shared apartment or mess.',
  inLanguage: 'en',
  author: { '@type': 'Organization', name: SITE_NAME },
  publisher: { '@type': 'Organization', name: SITE_NAME },
  mainEntityOfPage: PAGE_URL,
};

export default function SplitBillsGuide() {
  return (
    <main className="guide">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <h1>How to split apartment bills fairly between flatmates</h1>
      <p className="guide__meta">
        LocalHost Guides · <Link href="/guides/bn/split-apartment-bills">বাংলায় পড়ুন</Link>
      </p>

      <p>
        Sharing an apartment saves money — until the end of the month, when someone has to work out
        who owes what. Rent is easy. But add electricity, gas, water, Wi-Fi that only some people
        use, a shared meal pool, and the groceries someone bought out of pocket, and a simple split
        turns into an argument. This guide covers a fair, transparent method used by thousands of
        messes and shared flats.
      </p>

      <h2>1. Separate your costs into four buckets</h2>
      <ul>
        <li><strong>Fixed costs</strong> — rent, gas, water, building service charge. Same every month.</li>
        <li><strong>Variable costs</strong> — electricity. Changes monthly, entered from the meter or bill.</li>
        <li><strong>Optional costs</strong> — Wi-Fi, house maid, satellite TV. Only some flatmates use them.</li>
        <li><strong>Meals &amp; personal expenses</strong> — shared food shopping and things individuals bought for the flat.</li>
      </ul>
      <p>
        Mixing these together is the number one cause of disputes. Splitting everything equally is
        only fair if everyone uses everything equally — and they never do.
      </p>

      <h2>2. Split fixed costs (with custom rent support)</h2>
      <p>
        The simple version: divide the fixed total by the number of flatmates. But real apartments
        often have one person in the small room paying less, or a couple paying more. The fair
        formula is:
      </p>
      <div className="guide__example">
        <p><strong>Example.</strong> Rent + gas + water + service = ৳24,080 for 4 flatmates.
        Rafi has the small room and pays a fixed ৳4,500. The remaining ৳19,580 is split equally
        among the other 3 — ৳6,527 each.</p>
      </div>

      <h2>3. Electricity: enter it once, then lock it</h2>
      <p>
        Electricity should be entered by one trusted person (the bill manager) when the bill
        arrives, split equally, and then <strong>locked</strong> so nobody can quietly change the
        numbers later. A locked month with a visible history is what keeps trust in the system.
      </p>

      <h2>4. Optional costs: only opt-ins pay</h2>
      <p>
        If two of five flatmates never use the house maid, they should not pay for her. List each
        optional cost, record who opted in, and divide that cost only among those members.
      </p>

      <h2>5. Meal costs: the per-meal rate</h2>
      <p>The standard mess formula:</p>
      <div className="guide__example">
        <p><strong>Per-meal rate = total meal shopping ÷ total meals eaten</strong></p>
        <p>If the flat spent ৳18,000 on food and members ate 600 meals in total, the rate is ৳30.
        Someone who ate 80 meals owes ৳2,400; someone who ate 40 owes ৳1,200. Each person pays for
        exactly what they ate — tracked with a simple weekly checklist.</p>
      </div>

      <h2>6. Settle personal expenses with carry-forward</h2>
      <p>
        When one flatmate buys cleaning supplies or pays the plumber from their own pocket, record
        it. At month end, compare what each person spent against the equal share — whoever spent
        more carries a credit into next month, whoever spent less carries a debt. Over a few months
        it evens out automatically, without awkward cash exchanges.
      </p>

      <h2>7. Put it all together</h2>
      <p>Each flatmate&rsquo;s monthly bill is:</p>
      <ul>
        <li>their share of the fixed bucket (respecting custom rent), plus</li>
        <li>their equal share of electricity, plus</li>
        <li>their share of each optional cost they opted into, plus</li>
        <li>their meal count × the per-meal rate, plus or minus</li>
        <li>expense carry-forward and any adjustments.</li>
      </ul>
      <p>
        Doing this in a spreadsheet works — until someone forgets to update it, or two versions
        float around. The fix is a single shared source of truth that everyone can see but only
        the right people can edit.
      </p>

      <div className="guide__cta">
        <p><strong>{SITE_NAME}</strong> does all of this automatically — free for any apartment.</p>
        <Link href="/">Start splitting bills fairly</Link>
      </div>

      <nav className="guide__nav">
        <Link href="/guides">← Full user guide</Link>
        <Link href="/">Back to home</Link>
        <Link href="/guides/meal-rate">Meal rate guide →</Link>
      </nav>
    </main>
  );
}
