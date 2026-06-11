'use client';

import { useEffect, useRef } from 'react';
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

export function ChartBox({
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
  const ref = useRef<HTMLDivElement>(null);

  const isLight = theme === 'light';
  const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
  const tickColor = isLight ? '#656d76' : '#8b949e';

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: tickColor },
        position: window.innerWidth < 768 ? 'bottom' as const : 'right' as const,
      },
    },
    scales: type !== 'doughnut' ? {
      x: { grid: { color: gridColor }, ticks: { color: tickColor } },
      y: { grid: { color: gridColor }, ticks: { color: tickColor } },
    } : undefined,
    ...options,
  };

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(() => {});
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={`chart-box ${className}`} ref={ref}>
      {type === 'bar' && <Bar data={data as never} options={defaultOptions as never} />}
      {type === 'line' && <Line data={data as never} options={defaultOptions as never} />}
      {type === 'doughnut' && <Doughnut data={data as never} options={defaultOptions as never} />}
    </div>
  );
}
