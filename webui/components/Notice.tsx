import type { ReactNode } from 'react';
import { apiBase } from '@/lib/api';
import ax from '@/styles/archive.module.css';

/** A Seedit-style orange infobar (the look of Seedit's search options and single-comment boxes). */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className={ax.notice} role="status">
      {children}
    </div>
  );
}

/** Shown when the indexer API can't be reached. */
export function ApiDown() {
  return (
    <Notice>
      <strong>The indexer API isn’t reachable.</strong> Start it with <code>cd server &amp;&amp; npm run dev</code> — expected at{' '}
      <code>{apiBase}</code>.
    </Notice>
  );
}
