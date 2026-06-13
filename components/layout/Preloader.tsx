'use client';

import Image from 'next/image';
import { LOGO_SRC } from '@/lib/constants';

export function Preloader() {
  return (
    <div className="loader-overlay" role="status" aria-live="polite" aria-label="Loading LocalHost">
      <div className="loader-pulse">
        <span className="loader-pulse__ring loader-pulse__ring--1" />
        <span className="loader-pulse__ring loader-pulse__ring--2" />
        <span className="loader-pulse__ring loader-pulse__ring--3" />
        <div className="loader-pulse__core">
          <Image className="loader-pulse__logo" src={LOGO_SRC} alt="" width={54} height={54} priority />
        </div>
      </div>
      <div className="loader-wave" aria-hidden="true">
        <svg viewBox="0 0 140 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path className="loader-wave__track" d="M0 14 H24 L32 6 L40 22 L48 14 H140" />
          <path className="loader-wave__path" d="M0 14 H24 L32 6 L40 22 L48 14 H140" />
        </svg>
      </div>
      <div className="loader-meta">
        <div className="loader-text">LocalHost</div>
        <div className="loader-sub">Preparing your home</div>
      </div>
      <div className="loader-progress" aria-hidden="true"><span className="loader-progress__bar" /></div>
    </div>
  );
}
