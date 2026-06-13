import localFont from 'next/font/local';

/**
 * Self-hosted via next/font: fonts are inlined into the build with hashed
 * URLs, preloaded, and given size-adjusted fallbacks (no layout shift).
 * The CSS variables are consumed by --font-body / --font-head in localhost.css.
 */
export const figtree = localFont({
  src: [
    {
      path: '../public/assets/fonts/figtree-latin.woff2',
      weight: '300 700',
      style: 'normal',
    },
    {
      path: '../public/assets/fonts/figtree-italic-latin.woff2',
      weight: '400',
      style: 'italic',
    },
  ],
  variable: '--font-figtree',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
});

export const jakarta = localFont({
  src: [
    {
      path: '../public/assets/fonts/plus-jakarta-sans-latin.woff2',
      weight: '500 800',
      style: 'normal',
    },
    {
      path: '../public/assets/fonts/plus-jakarta-sans-italic-latin.woff2',
      weight: '600',
      style: 'italic',
    },
  ],
  variable: '--font-jakarta',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
});
