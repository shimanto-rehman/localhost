/** Stable option objects — avoid new references that force Chart.js to fully redraw. */
export const CHART_LEGEND_HIDDEN = { plugins: { legend: { display: false } } };

export const CHART_ANIMATION = {
  duration: 280,
  easing: 'easeOutQuart' as const,
};

export const CHART_ANIMATION_NONE = {
  duration: 0,
};
