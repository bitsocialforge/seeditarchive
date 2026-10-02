import Link from 'next/link';
import type { ReactNode } from 'react';
import { brandText, brandUrl, siteName } from '@/lib/site';
import styles from '@/styles/seedit/components/site-footer.module.css';

const SOURCE_URL = 'https://github.com/bitsocialforge/seeditarchive';

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

/** Seedit's SiteFooter (src/components/site-footer/site-footer.tsx) with the archive's own links. */
export function SiteFooter() {
  return (
    <footer className={styles.footer} aria-label={`${siteName} footer`}>
      <nav className={styles.panel} aria-label="Footer links">
        <section className={styles.column}>
          <h2 className={styles.heading}>archive</h2>
          <ul>
            <li>
              <Link href="/">front page</Link>
            </li>
            <li>
              <Link href="/search">search</Link>
            </li>
            <li>
              <Link href="/legal">legal</Link>
            </li>
          </ul>
        </section>
        <section className={styles.column}>
          <h2 className={styles.heading}>source</h2>
          <ul>
            <li>
              <ExternalLink href={SOURCE_URL}>github</ExternalLink>
            </li>
            <li>
              <ExternalLink href="https://github.com/bitsocialnet/bitsocial-indexer">indexer</ExternalLink>
            </li>
          </ul>
        </section>
        <section className={styles.column}>
          <h2 className={styles.heading}>apps &amp; tools</h2>
          <ul>
            <li>
              <ExternalLink href="https://seedit.app">seedit</ExternalLink>
            </li>
          </ul>
        </section>
        <section className={styles.column}>
          <h2 className={styles.heading}>&lt;3</h2>
          <ul>
            {brandText ? (
              <li>{brandUrl ? <ExternalLink href={brandUrl}>{brandText}</ExternalLink> : brandText}</li>
            ) : null}
            <li>
              <ExternalLink href="https://bitsocial.net">bitsocial</ExternalLink>
            </li>
          </ul>
        </section>
      </nav>
      <p className={styles.legal}>
        {siteName} is FOSS under GPL-3.0-or-later. Powered by Bitsocial
        <a className={styles.bitsocialLogoLink} href="https://bitsocial.net" target="_blank" rel="noopener noreferrer" aria-label="Bitsocial">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.bitsocialLogo} src="/assets/logo/bitsocial.svg" alt="" width="18" height="18" loading="lazy" />
        </a>
      </p>
    </footer>
  );
}
