import type { Metadata } from 'next';
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from './constants';

export const defaultMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Apartment Bill Splitter for Flatmates`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'apartment bill splitter',
    'flatmate bill sharing',
    'mess bill calculator',
    'Bangladesh rent split',
    'utility bill split',
    'meal cost tracker',
    'shared apartment expenses',
    'LocalHost app',
    'বিল ভাগ',
    'মেস বিল',
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  openGraph: {
    type: 'website',
    locale: 'en_BD',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Smart Apartment Bill Splitter`,
    description: SITE_DESCRIPTION,
    images: [{ url: '/assets/images/Logo.png', width: 512, height: 512, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Apartment Bill Splitter`,
    description: SITE_DESCRIPTION,
    images: ['/assets/images/Logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: { canonical: SITE_URL },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
  },
};

export const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Any',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'BDT' },
  inLanguage: 'en',
  audience: { '@type': 'Audience', geographicArea: { '@type': 'Country', name: 'Bangladesh' } },
};
