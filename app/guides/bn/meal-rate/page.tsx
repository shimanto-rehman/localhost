import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME, SITE_URL } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'মেস মিল রেট হিসাব — প্রতি মিলের খরচ কীভাবে বের করবেন | LocalHost',
  description:
    'মেস বা শেয়ার্ড ফ্ল্যাটের জন্য মিল রেট হিসাব করার সম্পূর্ণ নিয়ম। সূত্র: মোট খাবার খরচ ÷ মোট মিল সংখ্যা = প্রতি মিলের রেট। বাস্তব উদাহরণ সহ।',
  alternates: {
    canonical: `${SITE_URL}/guides/bn/meal-rate`,
    languages: {
      en: `${SITE_URL}/guides/meal-rate`,
      bn: `${SITE_URL}/guides/bn/meal-rate`,
    },
  },
};

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'মেস মিল রেট হিসাব — প্রতি মিলের খরচ বের করার নিয়ম',
  description:
    'মেস মিল রেট হিসাব করার সম্পূর্ণ গাইড — সূত্র, বাস্তব উদাহরণ, এবং LocalHost অ্যাপ কীভাবে এটি স্বয়ংক্রিয়ভাবে করে।',
  author: { '@type': 'Organization', name: SITE_NAME },
  publisher: { '@type': 'Organization', name: SITE_NAME },
  inLanguage: 'bn',
  url: `${SITE_URL}/guides/bn/meal-rate`,
  datePublished: '2025-01-01',
  dateModified: '2026-06-01',
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'মেস মিল রেটের সূত্র কী?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'মিল রেট = মোট খাবার তহবিল (বাজার খরচ + Food ক্যাটাগরির খরচ) ÷ মোট নিশ্চিত মিল সংখ্যা। উদাহরণ: ১৮,০০০ টাকা ÷ ৬০০ মিল = ৩০ টাকা প্রতি মিল।',
      },
    },
    {
      '@type': 'Question',
      name: 'মিল তহবিলে কোন কোন খরচ যোগ হবে?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'সাধারণত বাজার করার খরচ এবং Food ক্যাটাগরিতে লগ করা ব্যক্তিগত খাবার খরচ (যেমন কেউ চাল বা তেল কিনে দাবি করলে)। গ্যাস, বিদ্যুৎ, বা গৃহস্থালি সামগ্রী মিল তহবিলে যোগ হয় না।',
      },
    },
    {
      '@type': 'Question',
      name: 'যদি কেউ এক সপ্তাহ বাড়ি চলে যায়?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'ওই সময়ের মিলগুলো শূন্য থাকবে। তার মোট মিল কম হবে, তাই মিল বিল কম হবে। রেট একই থাকবে — শুধু প্রদেয় টাকা কম হবে।',
      },
    },
  ],
};

export default function BnMealRateGuidePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <article className="guide" lang="bn">
        <header className="guide__header">
          <div className="guide__badge">মিল রেট গাইড</div>
          <h1>মেস মিল রেট হিসাব</h1>
          <p className="guide__lead">
            শেয়ার্ড ফ্ল্যাট বা মেসের জন্য প্রতি মিলের খরচ (মিল রেট) কীভাবে বের করবেন — সূত্র,
            বাস্তব উদাহরণ, এবং সাধারণ ভুলগুলো যা প্রতি মাসে ঝামেলা তৈরি করে।
          </p>
          <p className="guide__meta">
            Also in: <Link href="/guides/meal-rate">Read in English — Meal Rate Calculator</Link>
          </p>
        </header>

        <section>
          <h2>মিল রেটের সূত্র</h2>
          <p>
            যে কোনো মেস বা শেয়ার্ড অ্যাপার্টমেন্টের জন্য মিল রেট এভাবে হিসাব করা হয়:
          </p>
          <div className="guide__formula-box">
            <strong>মিল রেট = মোট খাবার তহবিল ÷ মোট নিশ্চিত মিল সংখ্যা</strong>
            <br />
            <em>উদাহরণ: ১৮,০০০ টাকা ÷ ৬০০ মিল = ৩০ টাকা প্রতি মিল</em>
          </div>
          <p>
            তারপর প্রতিটি সদস্য পরিশোধ করবে: <strong>মিল রেট × তার মোট মিল সংখ্যা</strong>।
          </p>
          <p>
            যদি সিমান্তো ৪৫টি মিল খায় এবং রেট ৩০ টাকা হয়, তার মিল বিল = <strong>১,৩৫০ টাকা</strong>।
            তাউকির ৬২টি মিল খেলে তার বিল = <strong>১,৮৬০ টাকা</strong>। একই রেট — সম্পূর্ণ ন্যায্য।
          </p>
        </section>

        <section>
          <h2>মিল তহবিলে কী যোগ হবে?</h2>
          <p>
            মিল তহবিল হলো মেসের রান্নাঘরের জন্য মোট খরচ। সাধারণত এতে যোগ হয়:
          </p>
          <ul>
            <li><strong>বাজার করার খরচ</strong> — চাল, ডাল, তরকারি, তেল, মশলা, মাছ, মাংস</li>
            <li><strong>ব্যক্তিগত খাবার খরচ দাবি</strong> — কোনো সদস্য বাজার করে &ldquo;Food&rdquo; ক্যাটাগরিতে লগ করলে</li>
          </ul>
          <p>মিল তহবিলে সাধারণত যোগ <strong>হয় না</strong>:</p>
          <ul>
            <li>গ্যাস বিল (আলাদা ইউটিলিটি খরচ)</li>
            <li>বিদ্যুৎ বিল</li>
            <li>পরিষ্কারের সামগ্রী, রান্নাঘরের সরঞ্জাম</li>
            <li>ব্যক্তিগতভাবে বাইরে খাওয়ার খরচ</li>
          </ul>
        </section>

        <section>
          <h2>মিল গণনা কীভাবে করবেন</h2>
          <p>
            বেশিরভাগ মেসে মিল গণনা নিয়েই সমস্যা হয়। ভুল পদ্ধতিগুলো:
          </p>
          <ul>
            <li>অনুমান করা — &ldquo;আমি মোটামুটি ৫০টা মিল খেয়েছি&rdquo; (সঠিক নয়, ঝামেলা হয়)</li>
            <li>সবাই সমান খেয়েছে ধরে নেওয়া (অন্যায্য)</li>
            <li>শুধু রাতের খাবার গণনা করা, সকাল-দুপুর বাদ দেওয়া</li>
          </ul>
          <p>
            <strong>সঠিক পদ্ধতি:</strong> প্রতিদিন কে কোন মিল খেয়েছে তার চেকলিস্ট রাখুন।
            মাস শেষে প্রতিজনের মোট মিল গণনা করুন।
          </p>
          <p>
            LocalHost-এ সাপ্তাহিক মিল চেকলিস্ট আছে। প্রতি সপ্তাহে প্রতিটি সদস্য তাদের
            সকাল/দুপুর/রাতের খাবার মার্ক করেন। মাস শেষে স্বয়ংক্রিয়ভাবে মোট হিসাব হয়।
          </p>
        </section>

        <section>
          <h2>বাস্তব উদাহরণ — জুন ২০২৬</h2>

          <h3>ধাপ ১: মোট খাবার তহবিল বের করুন</h3>
          <table className="guide__table">
            <thead>
              <tr><th>আইটেম</th><th>পরিমাণ</th></tr>
            </thead>
            <tbody>
              <tr><td>সপ্তাহ ১ বাজার</td><td>৳৪,২০০</td></tr>
              <tr><td>সপ্তাহ ২ বাজার</td><td>৳৩,৮০০</td></tr>
              <tr><td>সপ্তাহ ৩ বাজার</td><td>৳৪,৫০০</td></tr>
              <tr><td>সপ্তাহ ৪ বাজার</td><td>৳৩,৯০০</td></tr>
              <tr><td>সিমান্তো: চাল (Food খরচ)</td><td>৳১,২০০</td></tr>
              <tr><td>তাউকির: তেল + মশলা (Food খরচ)</td><td>৳৪০০</td></tr>
              <tr><td className="guide__table-total"><strong>মোট খাবার তহবিল</strong></td><td className="guide__table-total"><strong>৳১৮,০০০</strong></td></tr>
            </tbody>
          </table>

          <h3>ধাপ ২: মোট নিশ্চিত মিল গণনা</h3>
          <table className="guide__table">
            <thead>
              <tr><th>সদস্য</th><th>মিল সংখ্যা</th></tr>
            </thead>
            <tbody>
              <tr><td>সিমান্তো</td><td>৪৫</td></tr>
              <tr><td>তাউকির</td><td>৬২</td></tr>
              <tr><td>পারভেজ</td><td>৫৮</td></tr>
              <tr><td>রাফি</td><td>৫৫</td></tr>
              <tr><td className="guide__table-total"><strong>মোট</strong></td><td className="guide__table-total"><strong>২২০</strong></td></tr>
            </tbody>
          </table>

          <h3>ধাপ ৩: মিল রেট হিসাব</h3>
          <div className="guide__formula-box">
            ৳১৮,০০০ ÷ ২২০ মিল = <strong>৳৮১.৮২ প্রতি মিল</strong>
          </div>

          <h3>ধাপ ৪: প্রতি সদস্যের মিল বিল</h3>
          <table className="guide__table">
            <thead>
              <tr><th>সদস্য</th><th>মিল</th><th>রেট</th><th>মিল বিল</th></tr>
            </thead>
            <tbody>
              <tr><td>সিমান্তো</td><td>৪৫</td><td>৳৮১.৮২</td><td>৳৩,৬৮২</td></tr>
              <tr><td>তাউকির</td><td>৬২</td><td>৳৮১.৮২</td><td>৳৫,০৭৩</td></tr>
              <tr><td>পারভেজ</td><td>৫৮</td><td>৳৮১.৮২</td><td>৳৪,৭৪৬</td></tr>
              <tr><td>রাফি</td><td>৫৫</td><td>৳৮১.৮২</td><td>৳৪,৫০০</td></tr>
              <tr><td className="guide__table-total"><strong>মোট</strong></td><td>২২০</td><td></td><td className="guide__table-total"><strong>৳১৮,০০১ ≈ ৳১৮,০০০ ✓</strong></td></tr>
            </tbody>
          </table>
          <p>
            মোট মিলে যায়। (ছোট পার্থক্য রাউন্ডিং এর কারণে।) প্রত্যেকে তার প্রকৃত খাওয়ার অনুযায়ী পরিশোধ করেছে।
          </p>
        </section>

        <section>
          <h2>সাধারণ ভুলগুলো</h2>

          <h3>১. Food খরচ মিল তহবিলে যোগ না করা</h3>
          <p>
            কেউ ১,২০০ টাকার চাল কিনলে কিন্তু লগ না করলে, মিল তহবিল কম দেখাবে — রেট কম মনে হবে,
            কিন্তু সে আসলে বাকিদের ভর্তুকি দিচ্ছে। সবসময় Food খরচ লগ করুন।
          </p>

          <h3>২. গুণ করার আগে রেট রাউন্ড করা</h3>
          <p>
            ৳১৮,০০০ ÷ ২২০ = ৳৮১.৮১৮... — গুণের আগে ৮২ টাকা করবেন না।
            সম্পূর্ণ ডেসিমাল দিয়ে গুণ করুন, শুধু চূড়ান্ত বিলটা রাউন্ড করুন।
            LocalHost স্বয়ংক্রিয়ভাবে এটি সঠিকভাবে করে।
          </p>

          <h3>৩. না খেয়ে মিল দাবি করা</h3>
          <p>
            মিল শুধু তখনই গণনা হবে যখন সত্যিই খাওয়া হয়েছে। Bill Manager বা Admin মাস
            চূড়ান্ত করার আগে চেকলিস্ট সম্পাদনা করতে পারবেন।
          </p>
        </section>

        <section>
          <h2>LocalHost দিয়ে স্বয়ংক্রিয়ভাবে করুন</h2>
          <p>
            LocalHost সব কিছু স্বয়ংক্রিয়ভাবে করে:
          </p>
          <ol>
            <li>সদস্যরা সাপ্তাহিক চেকলিস্টে মিল মার্ক করেন</li>
            <li>Bill Manager বাজার খরচ &ldquo;Food&rdquo; ক্যাটাগরিতে যোগ করেন</li>
            <li>মাস চূড়ান্ত করলে LocalHost মিল রেট হিসাব করে</li>
            <li>প্রতি সদস্যের মিল বিল তাদের বিলে দেখায়</li>
            <li>মাস লক হলে রেট ও মিল সংখ্যা স্থায়ী হয়</li>
          </ol>
          <p>
            <Link href="/login">আপনার অ্যাপার্টমেন্ট রেজিস্টার করুন</Link> — সম্পূর্ণ বিনামূল্যে।
          </p>
        </section>

        <section>
          <h2>প্রায়শই জিজ্ঞাসিত প্রশ্ন</h2>

          <details className="guide__faq-item">
            <summary>মিল তহবিল শূন্য থাকলে কী হবে?</summary>
            <p>
              কোনো Food খরচ লগ না করলে মিল রেট শূন্য হবে — অর্থাৎ বাজার খরচ রেকর্ড হয়নি।
              মাস চূড়ান্ত করার আগে নিশ্চিত করুন সব বাজার খরচ লগ করা আছে।
            </p>
          </details>

          <details className="guide__faq-item">
            <summary>নির্দিষ্ট (ফিক্সড) মিল রেট রাখা যাবে?</summary>
            <p>
              হ্যাঁ। LocalHost-এ ফিক্সড মিল রেট (যেমন সব সময় ৩০ টাকা/মিল) সেট করা যায়।
              এতে হিসাব সহজ হয় কিন্তু মাসে মাসে খরচের পার্থক্য হলে হিসাব মেলে না।
              বেশিরভাগ মেস ন্যায্যতার জন্য ডায়নামিক রেট ব্যবহার করে।
            </p>
          </details>

          <details className="guide__faq-item">
            <summary>সকাল, দুপুর, রাত — তিনটাই কি আলাদা গণনা হয়?</summary>
            <p>
              প্রতিটি মিল টাইপ (B/L/D) একটি &ldquo;মিল&rdquo; হিসেবে গণনা হয়।
              আপনি চাইলে LocalHost-এ শুধু রাতের খাবার বা যেকোনো কম্বিনেশন সেট করতে পারবেন।
            </p>
          </details>
        </section>

        <nav className="guide__nav">
          <Link href="/">← LocalHost হোমপেজ</Link>
          <Link href="/guides/bn/split-apartment-bills">মেস বিল ভাগ করার নিয়ম →</Link>
        </nav>
      </article>
    </>
  );
}
