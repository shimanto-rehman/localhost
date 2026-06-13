import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { SWRProvider } from '@/components/providers/SWRProvider';
import { defaultMetadata, jsonLd } from '@/lib/seo';
import { figtree, jakarta } from '@/lib/fonts';

export const metadata: Metadata = defaultMetadata;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${figtree.variable} ${jakarta.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <ThemeProvider>
          <SWRProvider>
            <ToastProvider>{children}</ToastProvider>
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
