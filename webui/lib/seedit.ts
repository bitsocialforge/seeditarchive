/**
 * Display helpers ported from Seedit (src/lib/utils/{address,post,time,url}-utils.ts)
 * so archived rows read exactly like they do in the Seedit app. English strings
 * come from Seedit's public/translations/en/default.json.
 */

/**
 * Seedit's getShortAddress: names (with a dot) as-is, keys as characters 8–20.
 * Seedit returns '' for a short non-name; the archive shows it whole instead,
 * so no row is left with a blank author or community.
 */
export function getShortAddress(address?: string | null): string {
  if (!address) return '';
  if (address.includes('.') || address.length < 20) return address;
  return address.slice(8, 20);
}

/** Seedit's getDisplayAddress: `.eth` aliases are shown as their `.bso` form. */
export function getDisplayAddress(address?: string | null): string {
  if (!address) return '';
  return address.toLowerCase().endsWith('.eth') ? `${address.slice(0, -4)}.bso` : address;
}

export const getShortDisplayAddress = (address?: string | null) => getDisplayAddress(getShortAddress(address));

/** Top bar / dropdown name: the short display address without `.bso`. */
export const getCompactCommunityName = (address?: string | null) => getShortDisplayAddress(address).replace(/\.bso$/i, '');

const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const COMPACT_LARGE = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 0 });

export function formatScore(score: number | '•' | '?'): string {
  if (typeof score !== 'number') return score;
  return (score < 100000 ? COMPACT : COMPACT_LARGE).format(score);
}

/** Seedit's getPostScore: a bullet until the post has any vote. */
export function getPostScore(upvoteCount: number, downvoteCount: number): '•' | number {
  if (upvoteCount === 0 && downvoteCount === 0) return '•';
  return upvoteCount - downvoteCount;
}

/** Seedit's getReplyScore: replies start at one point, like old reddit. */
export function getReplyScore(upvoteCount: number, downvoteCount: number): number {
  if (upvoteCount === 0 && downvoteCount === 0) return 1;
  if (upvoteCount === 1 && downvoteCount === 0) return 1;
  return upvoteCount - downvoteCount + 1;
}

/** Seedit's getFormattedTimeAgo, with its English strings. */
export function timeAgo(unixTimestamp: number | null | undefined): string {
  if (!unixTimestamp || Number.isNaN(unixTimestamp)) return '-';
  const d = Date.now() / 1000 - unixTimestamp;
  if (d < 120) return '1 minute ago';
  if (d < 3600) return `${Math.floor(d / 60)} minutes ago`;
  if (d < 7200) return '1 hour ago';
  if (d < 86400) return `${Math.floor(d / 3600)} hours ago`;
  if (d < 172800) return '1 day ago';
  if (d < 2592000) return `${Math.floor(d / 86400)} days ago`;
  if (d < 5184000) return '1 month ago';
  if (d < 31104000) return `${Math.floor(d / 2592000)} months ago`;
  if (d < 62208000) return '1 year ago';
  return `${Math.floor(d / 31104000)} years ago`;
}

const UTC_TIMESTAMP = new Intl.DateTimeFormat('en', {
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: 'UTC',
  hour12: false,
});

/** Seedit's formatLocalizedUTCTimestamp ("Tue Jul 21 2026 10:11:05 UTC"), used as a hover title. */
export const utcTimestamp = (unixTimestamp: number) => `${UTC_TIMESTAMP.format(new Date(unixTimestamp * 1000)).replace(/,/g, '')} UTC`;

const DATE = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Seedit's getFormattedDate ("Jul 21, 2026"), in UTC so a cached page reads the same everywhere. */
export const formattedDate = (unixTimestamp: number) => DATE.format(new Date(unixTimestamp * 1000));

export const isoDate = (unixTimestamp: number) => new Date(unixTimestamp * 1000).toISOString();

export function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** Only http(s) URLs from archived content become links or media sources. */
export function safeHttpUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

/** rel for links whose target came from archived, user-generated content. */
export const UGC_REL = 'noopener noreferrer nofollow';

type Votable = { cid: string; upvote_count: number; downvote_count: number; timestamp: number };

/**
 * Seedit's sortRepliesByBest (reddit's "best": the lower bound of the Wilson
 * score interval), oldest first as the tiebreaker. Returns a new array.
 */
export function sortByBest<T extends Votable>(items: readonly T[]): T[] {
  const scores = new Map<string, number>();
  const z = 1.281551565545;
  for (const item of items) {
    const up = item.upvote_count || 0;
    const n = up + (item.downvote_count || 0);
    if (n === 0) {
      scores.set(item.cid, 0);
      continue;
    }
    const p = up / n;
    const left = p + (1 / (2 * n)) * z * z;
    const right = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
    const under = 1 + (1 / n) * z * z;
    scores.set(item.cid, (left - right) / under);
  }
  return [...items]
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    .sort((a, b) => (scores.get(b.cid) || 0) - (scores.get(a.cid) || 0));
}

export const pluralize = (count: number, one: string, many: string) => (count === 1 ? one : many);
