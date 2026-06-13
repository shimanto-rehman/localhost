'use client';

import dynamic from 'next/dynamic';

function ChartSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`chart-box chart-box--loading ${className}`} aria-hidden>
      <div className="chart-skeleton" />
    </div>
  );
}

/**
 * Chart.js (~80 KB gzip) is loaded on demand so pages render their shell
 * immediately; a skeleton fills the chart area until the bundle arrives.
 */
const LazyChartBox = dynamic(
  () => import('./ChartBoxImpl').then((m) => m.ChartBoxImpl),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

export function ChartBox(props: {
  type: 'bar' | 'line' | 'doughnut';
  data: object;
  options?: object;
  className?: string;
}) {
  return <LazyChartBox {...props} />;
}
