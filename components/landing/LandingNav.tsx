'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from '@/components/providers/ThemeProvider';
import { LOGO_SRC } from '@/lib/constants';

export function LandingNav() {
  const { toggleTheme } = useTheme();

  return (
    <nav className="lp-nav">
      <div className="lp-nav__inner lp-container">
        <Link href="/" className="lp-nav__brand">
          <Image src={LOGO_SRC} width={32} height={32} alt="LocalHost logo" />
          <span className="lp-nav__brand-name">LocalHost</span>
        </Link>
        <div className="lp-nav__links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#faq">FAQ</a>
          <Link href="/guides">User guide</Link>
        </div>
        <div className="lp-nav__actions">
          <button
            type="button"
            className="theme-toggle lp-nav__theme"
            onClick={toggleTheme}
            aria-label="Toggle dark/light mode"
          >
            <svg className="icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
            </svg>
            <svg className="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>
          <Link href="/login" className="lp-btn lp-btn--ghost">Sign In</Link>
          <a href="#how-it-works" className="lp-btn lp-btn--primary">Get Started</a>
        </div>
      </div>
    </nav>
  );
}
