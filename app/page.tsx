import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Ambient } from '@/components/layout/Ambient';
import { LandingNav } from '@/components/landing/LandingNav';
import { DeveloperCredit } from '@/components/landing/DeveloperCredit';
import { SITE_NAME, SITE_URL, LOGO_SRC } from '@/lib/constants';

export const metadata: Metadata = {
  title: `${SITE_NAME} — Fair Apartment Bill Splitting for Flatmates in Bangladesh`,
  description:
    'Free apartment bill splitter for flatmates and mess members in Bangladesh. Split rent, electricity, gas, water, meal costs and personal expenses — everyone sees the same numbers. মেস বিল হিসাব করুন সহজেই।',
  alternates: {
    canonical: SITE_URL,
    languages: {
      en: `${SITE_URL}/guides/split-apartment-bills`,
      bn: `${SITE_URL}/guides/bn/split-apartment-bills`,
    },
  },
};

const FAQS = [
  {
    q: 'How does LocalHost split apartment bills?',
    a: 'Fixed costs (rent, gas, water, service charge) are divided equally or with custom rent contributions. Variable electricity is entered monthly by the Bill Manager and then locked. Optional costs like Wi‑Fi or a house maid are split only among members who opt in. Meals use a shopping pool divided by confirmed meal counts.',
  },
  {
    q: 'Is LocalHost free?',
    a: 'Yes — completely free. Register your apartment once, add flatmates, and start splitting bills the same day. No subscription, no credit card, no limits.',
  },
  {
    q: 'How is the per-meal cost calculated? (মিল রেট কীভাবে হিসাব হয়?)',
    a: 'Total meal shopping plus Food category expenses for the month is divided by the total confirmed meals. Each member pays the per-meal rate × the meals they actually ate, tracked on the weekly checklist.',
  },
  {
    q: 'Can one flatmate pay a different rent than others?',
    a: 'Yes. The rent split supports custom fixed contributions — one or more members pay a set amount (e.g. the smaller room pays ৳4,500 fixed). The remainder is divided equally among the rest.',
  },
  {
    q: 'Who can lock or change the monthly bill?',
    a: 'Only the Bill Manager or Admin can enter electricity and lock the month. Once locked the bill is read-only for everyone. Adjustments are tracked separately so the full history stays transparent.',
  },
  {
    q: 'Is my data secure?',
    a: 'Passwords are hashed with bcrypt. Sensitive fields like NID numbers are encrypted at rest. Every member has their own account with role-based permissions. Full JSON backup export is available any time.',
  },
  {
    q: 'Does it work on mobile?',
    a: 'Yes. LocalHost is fully responsive with a bottom navigation bar optimised for phones. Open it in any browser — no app store download needed.',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Any',
  url: SITE_URL,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'BDT' },
  description: 'Free apartment bill splitter for flatmates in Bangladesh.',
  inLanguage: ['en', 'bn'],
  audience: { '@type': 'Audience', geographicArea: { '@type': 'Country', name: 'Bangladesh' } },
};

const FEATURES = [
  {
    icon: 'bill',
    title: 'Fair Bill Splitting',
    desc: 'Rent, gas, water, service charge — split equally or with custom per-member amounts. Electricity entered monthly, then locked so nobody can change the numbers.',
  },
  {
    icon: 'meal',
    title: 'Meal Management',
    desc: 'Weekly meal checklist per member. Shopping pool auto-divides by confirmed meals. You pay exactly for the meals you ate — nothing more.',
  },
  {
    icon: 'expense',
    title: 'Expense Tracking',
    desc: 'Log personal flat expenses with categories. The carry-forward system evens out the balance over months — no awkward cash exchanges.',
  },
  {
    icon: 'lock',
    title: 'Locked Monthly Bills',
    desc: 'The Bill Manager enters electricity and locks the month. Locked bills are read-only. Every change is tracked so disputes never happen.',
  },
  {
    icon: 'payment',
    title: 'Payment Reference',
    desc: 'The Bill Manager\'s bKash, Nagad, Rocket, and bank details are one tap away. Copy amount + account. Pay in seconds.',
  },
  {
    icon: 'chart',
    title: 'Yearly Analytics',
    desc: 'Charts for bills, meals, and expenses across the full year. See trends, compare months, and understand where money goes.',
  },
];

const TESTIMONIALS = [
  {
    initials: 'RH',
    color: '#2dd4bf',
    name: 'Rifat Hossain',
    role: 'Bill Manager · 4-person mess, Mirpur',
    quote:
      '"We had arguments every month about grocery bills. LocalHost logs everything — the meal rate, who bought what, exact amounts. Zero disputes for 6 months now."',
  },
  {
    initials: 'KI',
    color: '#a78bfa',
    name: 'Kamrul Islam',
    role: 'Admin · 5-person mess, Dhanmondi',
    quote:
      '"I used to spend 2 hours in Excel every month. Now I enter the electricity bill, click lock, and all 5 flatmates see their exact share instantly."',
  },
  {
    initials: 'TA',
    color: '#38bdf8',
    name: 'Tamanna Akter',
    role: 'Flatmate · 3-person flat, Uttara',
    quote:
      '"The carry-forward system is brilliant. When I buy cleaning supplies for the flat it gets credited automatically. No more mental accounting."',
  },
];

function FeatureSVG({ icon }: { icon: string }) {
  if (icon === 'bill') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  );
  if (icon === 'meal') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 2v7c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/>
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z"/>
    </svg>
  );
  if (icon === 'expense') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  );
  if (icon === 'lock') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
  if (icon === 'payment') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  );
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}

function DashboardMockup() {
  return (
    <div className="mock-browser" role="img" aria-label="LocalHost dashboard preview">
      <div className="mock-chrome">
        <span className="mock-dot mock-dot--r" /><span className="mock-dot mock-dot--y" /><span className="mock-dot mock-dot--g" />
        <span className="mock-url-bar">localhostbill.vercel.app/dashboard</span>
      </div>
      <div className="mock-screen">
        <div className="mock-sb">
          <div className="mock-sb-logo">LH</div>
          <div className="mock-sb-item mock-sb-item--on">Dashboard</div>
          <div className="mock-sb-item">Bills</div>
          <div className="mock-sb-item">Meals</div>
          <div className="mock-sb-item">Expenses</div>
          <div className="mock-sb-item">Settings</div>
        </div>
        <div className="mock-main">
          <div className="mock-topbar">
            <span className="mock-topbar-title">Dashboard</span>
            <span className="mock-topbar-meta">June 2026</span>
          </div>
          <div className="mock-stat-row">
            <div className="mock-stat-card">
              <div className="mock-sv">৳12,450</div>
              <div className="mock-sl">Total Bill</div>
            </div>
            <div className="mock-stat-card mock-stat-card--accent">
              <div className="mock-sv">৳3,113</div>
              <div className="mock-sl">Your Share</div>
            </div>
            <div className="mock-stat-card">
              <div className="mock-sv">45</div>
              <div className="mock-sl">Meals</div>
            </div>
          </div>
          <div className="mock-chart-area">
            <div className="mock-chart-label">Monthly bills — 2026</div>
            <div className="mock-bars">
              {[55, 70, 65, 40, 85, 60].map((h, i) => (
                <div key={i} className={`mock-bar${i === 4 ? ' mock-bar--hi' : ''}`} style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="mock-bar-labels">
              {['Jan','Feb','Mar','Apr','May','Jun'].map((m) => <span key={m}>{m}</span>)}
            </div>
          </div>
          <div className="mock-member-list">
            {[
              { init: 'SR', col: '#2dd4bf', name: 'Shimanto', amt: '৳7,913', paid: true },
              { init: 'TR', col: '#a78bfa', name: 'Tauqir',   amt: '৳7,913', paid: false },
              { init: 'PI', col: '#38bdf8', name: 'Parvez',   amt: '৳6,500', paid: true },
            ].map((m) => (
              <div key={m.name} className="mock-mbr">
                <div className="mock-ava" style={{ background: m.col }}>{m.init}</div>
                <span className="mock-mname">{m.name}</span>
                <span className="mock-mamt">{m.amt}</span>
                <span className={`mock-mstatus ${m.paid ? 'mock-paid' : 'mock-due'}`}>
                  {m.paid ? 'Paid ✓' : 'Due'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BillMockup() {
  return (
    <div className="mock-phone" role="img" aria-label="Bill breakdown preview">
      <div className="mock-phone-notch" />
      <div className="mock-phone-screen">
        <div className="mock-phone-header">Monthly Bill · June 2026</div>
        <div className="mock-lock-badge">🔒 Locked</div>
        <div className="mock-bill-rows">
          <div className="mock-bill-row"><span>Rent share</span><span>৳5,000</span></div>
          <div className="mock-bill-row"><span>Electricity</span><span>৳800</span></div>
          <div className="mock-bill-row"><span>Gas + Water</span><span>৳1,020</span></div>
          <div className="mock-bill-row"><span>Wi-Fi (opt-in)</span><span>৳267</span></div>
          <div className="mock-bill-row"><span>Meals (45×৳30)</span><span>৳1,350</span></div>
          <div className="mock-bill-row mock-bill-row--credit"><span>Carry-forward</span><span>−৳200</span></div>
          <div className="mock-bill-row mock-bill-row--total"><span>Total</span><span>৳8,237</span></div>
        </div>
      </div>
    </div>
  );
}

function MealMockup() {
  const meals = ['B','L','D'];
  const days = ['S','M','T','W','T'];
  const checked = [[1,1,0],[1,0,1],[0,1,1],[1,1,1],[0,0,1]];
  return (
    <div className="mock-phone" role="img" aria-label="Meal checklist preview">
      <div className="mock-phone-notch" />
      <div className="mock-phone-screen">
        <div className="mock-phone-header">Meals · Week 2 · Jun</div>
        <div className="mock-meal-grid">
          <div className="mock-meal-head">
            <span />
            {days.map((d,i) => <span key={i}>{d}</span>)}
          </div>
          {meals.map((meal, mi) => (
            <div key={meal} className="mock-meal-row">
              <span className="mock-meal-lbl">{meal}</span>
              {days.map((_, di) => (
                <span key={di} className={`mock-meal-dot ${checked[di][mi] ? 'mock-meal-dot--on' : ''}`} />
              ))}
            </div>
          ))}
        </div>
        <div className="mock-meal-stat">Total: 42 meals this month · ৳30/meal</div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }} />
      <Ambient />

      <div className="lp">
        <LandingNav />

        {/* ── Hero ── */}
        <section className="lp-hero" id="hero">
          <div className="lp-hero__inner lp-container">
            <div className="lp-hero__text">
              <div className="lp-badge">🇧🇩 Built for Bangladesh messes &amp; shared flats</div>
              <h1 className="lp-hero__h1">
                One app.<br />
                Every flatmate.<br />
                <span className="lp-gradient-text">Zero disputes.</span>
              </h1>
              <p className="lp-hero__sub">
                LocalHost calculates rent, electricity, meals, and personal expenses — so every flatmate knows exactly what they owe, and why, every month.
              </p>
              <div className="lp-hero__actions">
                <Link href="/login" className="lp-btn lp-btn--primary lp-btn--lg">
                  Get Started Free
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>
                <a href="#how-it-works" className="lp-btn lp-btn--ghost lp-btn--lg">See how it works</a>
              </div>
              <div className="lp-hero__proof">
                <span>✓ Free forever</span>
                <span>✓ No credit card</span>
                <span>✓ Works on mobile</span>
              </div>
            </div>
            <div className="lp-hero__visual">
              <DashboardMockup />
            </div>
          </div>
        </section>

        {/* ── Trust bar ── */}
        <div className="lp-trust">
          <div className="lp-container lp-trust__inner">
            {[
              { icon: '🔒', text: 'Bills lock when done' },
              { icon: '📊', text: 'Transparent math' },
              { icon: '📱', text: 'Works on any device' },
              { icon: '🆓', text: 'Completely free' },
              { icon: '🔐', text: 'Encrypted data' },
            ].map((item) => (
              <div key={item.text} className="lp-trust__item">
                <span>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Features ── */}
        <section className="lp-features-section" id="features">
          <div className="lp-container">
            <div className="lp-section-head">
              <h2 className="lp-section-title">Everything a shared flat needs</h2>
              <p className="lp-section-sub">
                One app to replace the WhatsApp screenshots, paper chits, and disputed Excel sheets.
              </p>
            </div>
            <div className="lp-features-grid">
              {FEATURES.map((f) => (
                <article key={f.title} className="lp-feat-card">
                  <div className="lp-feat-icon"><FeatureSVG icon={f.icon} /></div>
                  <h3 className="lp-feat-title">{f.title}</h3>
                  <p className="lp-feat-desc">{f.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="lp-steps-section" id="how-it-works">
          <div className="lp-container">
            <div className="lp-section-head">
              <h2 className="lp-section-title">Start splitting in minutes</h2>
              <p className="lp-section-sub">No training needed. Most apartments are live in under 10 minutes.</p>
            </div>
            <div className="lp-steps">
              <div className="lp-step">
                <div className="lp-step__num">01</div>
                <div className="lp-step__content">
                  <h3>Register your apartment</h3>
                  <p>Apartment name, address, and a password — done in 30 seconds. You get a unique Registration ID to share with flatmates.</p>
                </div>
              </div>
              <div className="lp-step">
                <div className="lp-step__num">02</div>
                <div className="lp-step__content">
                  <h3>Add flatmates &amp; configure costs</h3>
                  <p>Add members with their roles. Set fixed costs, optional costs, meal types, and rent splits. The defaults work for most Dhaka messes out of the box.</p>
                </div>
              </div>
              <div className="lp-step">
                <div className="lp-step__num">03</div>
                <div className="lp-step__content">
                  <h3>Lock the bill every month</h3>
                  <p>Enter electricity, finalize meals, lock the month. Every flatmate sees their exact breakdown with every cost explained. No surprises.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Formula / Bill breakdown ── */}
        <section className="lp-formula-section">
          <div className="lp-container lp-formula-inner">
            <div className="lp-formula-text">
              <div className="lp-badge">Transparent by design</div>
              <h2>Every number has an explanation</h2>
              <p>
                Unlike a shared spreadsheet where totals just appear, LocalHost shows the full formula for every line — rent share formula, meal rate calculation, carry-forward balance, everything.
              </p>
              <p>No more &ldquo;why is my bill this much?&rdquo; questions in the group chat.</p>
              <Link href="/guides/split-apartment-bills" className="lp-formula-link">
                Read the full formula guide →
              </Link>
            </div>
            <div className="lp-formula-card">
              <div className="lp-formula-card__header">
                <span className="lp-formula-card__name">Shimanto&rsquo;s Bill — June 2026</span>
                <span className="lp-formula-card__lock">🔒 Locked</span>
              </div>
              <div className="lp-formula-rows">
                <div className="lp-formula-row">
                  <span className="lp-formula-label">🏠 Rent share (৳20,000 ÷ 4)</span>
                  <span className="lp-formula-val">৳5,000</span>
                </div>
                <div className="lp-formula-row">
                  <span className="lp-formula-label">⚡ Electricity (৳3,200 ÷ 4)</span>
                  <span className="lp-formula-val">৳800</span>
                </div>
                <div className="lp-formula-row">
                  <span className="lp-formula-label">💧 Gas + Water + Service</span>
                  <span className="lp-formula-val">৳1,020</span>
                </div>
                <div className="lp-formula-row">
                  <span className="lp-formula-label">📶 Wi‑Fi (opted in, ÷ 3)</span>
                  <span className="lp-formula-val">৳267</span>
                </div>
                <div className="lp-formula-row">
                  <span className="lp-formula-label">🧹 House Maid (opted out)</span>
                  <span className="lp-formula-val lp-formula-val--zero">৳0</span>
                </div>
                <div className="lp-formula-row">
                  <span className="lp-formula-label">🍚 Meals (45 × ৳30/meal)</span>
                  <span className="lp-formula-val">৳1,350</span>
                </div>
                <div className="lp-formula-row">
                  <span className="lp-formula-label">↩ Carry-forward credit</span>
                  <span className="lp-formula-val lp-formula-val--credit">−৳200</span>
                </div>
              </div>
              <div className="lp-formula-total">
                <span>Total</span>
                <span>৳8,237</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── App Previews ── */}
        <section className="lp-previews-section">
          <div className="lp-container">
            <div className="lp-section-head">
              <h2 className="lp-section-title">See it in action</h2>
              <p className="lp-section-sub">Real screens from the app — built for clarity, not complexity.</p>
            </div>
            <div className="lp-previews-grid">
              <div className="lp-preview-item">
                <DashboardMockup />
                <p className="lp-preview-caption">Dashboard — bills, meals &amp; member balances at a glance</p>
              </div>
              <div className="lp-preview-col">
                <div className="lp-preview-item lp-preview-item--sm">
                  <BillMockup />
                  <p className="lp-preview-caption">Bill breakdown per member with every line explained</p>
                </div>
                <div className="lp-preview-item lp-preview-item--sm">
                  <MealMockup />
                  <p className="lp-preview-caption">Weekly meal checklist — mark who ate which meals</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="lp-testimonials-section">
          <div className="lp-container">
            <div className="lp-section-head">
              <h2 className="lp-section-title">Trusted by flatmates across Bangladesh</h2>
            </div>
            <div className="lp-testimonials-grid">
              {TESTIMONIALS.map((t) => (
                <article key={t.name} className="lp-testimonial">
                  <blockquote className="lp-testimonial__quote">{t.quote}</blockquote>
                  <footer className="lp-testimonial__footer">
                    <div className="lp-testimonial__avatar" style={{ background: t.color }}>{t.initials}</div>
                    <div>
                      <div className="lp-testimonial__name">{t.name}</div>
                      <div className="lp-testimonial__role">{t.role}</div>
                    </div>
                  </footer>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="lp-faq-section" id="faq">
          <div className="lp-container lp-faq-inner">
            <div className="lp-section-head">
              <h2 className="lp-section-title">Frequently asked questions</h2>
              <p className="lp-section-sub">
                Also see: <Link href="/guides">Full user guide</Link> ·{' '}
                <Link href="/guides/split-apartment-bills">How to split apartment bills</Link> ·{' '}
                <Link href="/guides/bn/split-apartment-bills">বাংলায় পড়ুন</Link> ·{' '}
                <Link href="/guides/meal-rate">Meal rate calculator guide</Link>
              </p>
            </div>
            <div className="lp-faq-list">
              {FAQS.map((f) => (
                <details key={f.q} className="lp-faq-item">
                  <summary className="lp-faq-q">{f.q}</summary>
                  <p className="lp-faq-a">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="lp-cta-section">
          <div className="lp-container lp-cta-inner">
            <div className="lp-cta-glow" aria-hidden />
            <div className="lp-cta-badge">Free forever · No limits · No credit card</div>
            <h2 className="lp-cta-title">Start splitting bills fairly today</h2>
            <p className="lp-cta-sub">
              Register your apartment in 30 seconds. Every flatmate gets their own account. The math is always transparent.
            </p>
            <div className="lp-cta-actions">
              <Link href="/login" className="lp-btn lp-btn--primary lp-btn--xl">
                Register Your Apartment Free
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
              <Link href="/login" className="lp-btn lp-btn--ghost lp-btn--lg">Sign In</Link>
            </div>
          </div>
        </section>

        <DeveloperCredit />

        {/* ── Footer ── */}
        <footer className="lp-footer">
          <div className="lp-container lp-footer__inner">
            <div className="lp-footer__brand">
              <Image src={LOGO_SRC} width={28} height={28} alt="LocalHost" />
              <span>LocalHost</span>
            </div>
            <div className="lp-footer__links">
              <Link href="/guides">User guide</Link>
              <Link href="/guides/split-apartment-bills">How to split bills</Link>
              <Link href="/guides/bn/split-apartment-bills">বিল ভাগ করার নিয়ম</Link>
              <Link href="/guides/meal-rate">Meal rate guide</Link>
              <Link href="/guides/bn/meal-rate">মিল রেট গাইড</Link>
            </div>
            <p className="lp-footer__copy">
              &copy; {new Date().getFullYear()} LocalHost — free apartment bill splitter for flatmates in Bangladesh.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
