import { isCommunities, isCommunity, isHealth, isPostPage, isSearchResult, isThread } from './api-contract.ts';

const BASE = process.env.INDEXER_API ?? 'http://localhost:4000';

/**
 * Fetch JSON from the indexer API; returns null on any failure (API down, 404…).
 * `revalidate` (seconds) opts the request into Next's data cache so SSR pages
 * don't hit the API on every request; omit it for uncached (no-store) fetches.
 */
async function get<T>(path: string, isExpected: (value: unknown) => value is T, revalidate?: number): Promise<T | null> {
  try {
    const res = await fetch(
      `${BASE}${path}`,
      revalidate === undefined ? { cache: 'no-store' } : { next: { revalidate } },
    );
    if (!res.ok) return null;
    const value: unknown = await res.json();
    return isExpected(value) ? value : null;
  } catch {
    return null;
  }
}

export const apiBase = BASE;

export const getHealth = () => get('/api/health', isHealth, 60);
export const getCommunities = (revalidate = 300) => get('/api/communities', isCommunities, revalidate);
export const getCommunity = (address: string) =>
  get(`/api/communities/${encodeURIComponent(address)}`, isCommunity, 300);
export const getPosts = (query = '', revalidate = 60) => get(`/api/posts${query}`, isPostPage, revalidate);
export const getThread = (cid: string) => get(`/api/posts/${encodeURIComponent(cid)}`, isThread, 300);
/** `options` adds sort/time/page/limit parameters (see lib/listing.ts). */
export const search = (q: string, options: Record<string, string> = {}) =>
  get(`/api/search?${new URLSearchParams({ q, ...options }).toString()}`, isSearchResult);
