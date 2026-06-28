import Link from 'next/link';
import { Ambient } from '@/components/layout/Ambient';

export type ManualTocItem = {
  id: string;
  label: string;
};

export function GuideManualShell({
  children,
  toc,
}: {
  children: React.ReactNode;
  toc: ManualTocItem[];
}) {
  return (
    <div className="manual">
      <Ambient />
      <header className="manual__topbar">
        <div className="manual__topbar-inner lp-container">
          <Link href="/" className="manual__back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to home
          </Link>
          <span className="manual__topbar-label">User Guide</span>
          <Link href="/login" className="manual__topbar-cta lp-btn lp-btn--primary">
            Open app
          </Link>
        </div>
      </header>

      <div className="manual__layout lp-container">
        <aside className="manual__toc" aria-label="Table of contents">
          <p className="manual__toc-title">On this page</p>
          <nav>
            <ol className="manual__toc-list">
              {toc.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`}>{item.label}</a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="manual__toc-extra">
            <p>Deep dives</p>
            <Link href="/guides/split-apartment-bills">Bill splitting formula</Link>
            <Link href="/guides/meal-rate">Meal rate calculator</Link>
          </div>
        </aside>

        <article className="manual__content">{children}</article>
      </div>
    </div>
  );
}
