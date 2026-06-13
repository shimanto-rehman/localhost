'use client';

import { memo, useEffect, useMemo, useRef } from 'react';
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
import { CHART_ANIMATION } from './chart-defaults';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

type ChartType = 'bar' | 'line' | 'doughnut';

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

function ChartBoxImplInner({
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
          labels: { color: palette.tick, boxWidth: 12, padding: 10 },
          position: legendPosition as 'bottom' | 'right',
          // Legend clicks redraw the whole chart — disable to keep interactions cheap.
          onClick: () => undefined,
          onHover: () => undefined,
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
              x: { grid: { color: palette.grid }, ticks: { color: palette.tick, maxTicksLimit: 12 } },
              y: { grid: { color: palette.grid }, ticks: { color: palette.tick, maxTicksLimit: 8 } },
            }
          : undefined,
      ...options,
    };
  }, [theme, type, options]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let frame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const canvas = el.querySelector('canvas');
        if (canvas) ChartJS.getChart(canvas)?.resize();
      });
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, []);

  const ChartComponent = type === 'bar' ? Bar : type === 'line' ? Line : Doughnut;

  return (
    <div className={`chart-box ${className}`} ref={containerRef}>
      <ChartComponent data={data as never} options={chartOptions as never} redraw={false} />
    </div>
  );
}

export const ChartBoxImpl = memo(ChartBoxImplInner);
