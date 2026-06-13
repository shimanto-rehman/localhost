'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { useTheme } from '@/components/providers/ThemeProvider';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

type ChartType = 'bar' | 'line' | 'doughnut';

const CHART_ANIMATION = {
  duration: 800,
  easing: 'easeOutQuart' as const,
};

function chartPalette(theme: 'dark' | 'light') {
  const isLight = theme === 'light';
  return {
    grid: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)',
    tick: isLight ? '#656d76' : '#8b949e',
    tooltipBg: isLight ? '#ffffff' : '#1c2128',
    tooltipTitle: isLight ? '#1f2328' : '#e6edf3',
    tooltipBody: isLight ? '#656d76' : '#8b949e',
  };
}

export function ChartBoxImpl({
  type,
  data,
  options,
  className = '',
}: {
  type: ChartType;
  data: object;
  options?: object;
  className?: string;
}) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  const chartOptions = useMemo(() => {
    const palette = chartPalette(theme);
    const legendPosition =
      typeof window !== 'undefined' && window.innerWidth < 768 ? 'bottom' : 'right';

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: CHART_ANIMATION,
      plugins: {
        legend: {
          labels: { color: palette.tick },
          position: legendPosition as 'bottom' | 'right',
        },
        tooltip: {
          backgroundColor: palette.tooltipBg,
          titleColor: palette.tooltipTitle,
          bodyColor: palette.tooltipBody,
          borderColor: palette.grid,
          borderWidth: 1,
          cornerRadius: 10,
          padding: 12,
        },
      },
      scales:
        type !== 'doughnut'
          ? {
              x: { grid: { color: palette.grid }, ticks: { color: palette.tick } },
              y: { grid: { color: palette.grid }, ticks: { color: palette.tick } },
            }
          : undefined,
      ...options,
    };
  }, [theme, type, options]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const canvas = el.querySelector('canvas');
      if (canvas) ChartJS.getChart(canvas)?.resize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Remount on theme change so charts replay entrance animation (matches backup renderCharts).
  const chartKey = `${type}-${theme}`;

  return (
    <div className={`chart-box ${className}`} ref={containerRef}>
      {type === 'bar' && (
        <Bar key={chartKey} data={data as never} options={chartOptions as never} />
      )}
      {type === 'line' && (
        <Line key={chartKey} data={data as never} options={chartOptions as never} />
      )}
      {type === 'doughnut' && (
        <Doughnut key={chartKey} data={data as never} options={chartOptions as never} />
      )}
    </div>
  );
}
