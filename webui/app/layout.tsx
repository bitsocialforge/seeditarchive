import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import type { ReactNode } from 'react';
import './globals.css';
import { DevTools } from '@/components/DevTools';
import { PerfBoundary } from '@/components/PerfBoundary';
import { SiteFooter } from '@/components/SiteFooter';
import { siteName, siteTitle, siteUrl } from '@/lib/site';
import app from '@/styles/seedit/app.module.css';

const description = 'The permanent public archive and search engine for Seedit communities.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: siteTitle, template: `%s · ${siteName}` },
  description,
  openGraph: { siteName: siteTitle, type: 'website', title: siteTitle, description },
  twitter: { card: 'summary' },
  // As in Seedit: third-party media hosts get no referrer (some refuse hotlinked media that carries one).
  referrer: 'no-referrer',
};

// Seedit's default "light" theme: its tokens are scoped to `:root .light`, set
// on <body> (for the page background) and on the app root, as Seedit does.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="light">
        <DevTools />
        <PerfBoundary>
          <div className={`${app.app} light`}>
            {children}
            <SiteFooter />
          </div>
        </PerfBoundary>
        <Analytics />
      </body>
    </html>
  );
}
