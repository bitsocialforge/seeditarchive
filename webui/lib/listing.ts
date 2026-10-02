/**
 * Query-string state of the listing pages (feeds, search, thread reply sort).
 * Defaults are never written into URLs, so the default view of every page has
 * one URL; any non-default state is served `noindex, follow` with the
 * canonical pointing at the default view.
 */

export const FEED_PAGE_SIZE = 25;
/** Deep pages are reachable through next links; beyond this they are refused as junk. */
const MAX_PAGE = 1000;

type SearchParamValue = string | string[] | undefined;
export type RawSearchParams = Record<string, SearchParamValue>;

const first = (value: SearchParamValue) => (Array.isArray(value) ? value[0] : value);

/** Seedit's top time filters, with old reddit's url values. */
export const TIME_FILTERS = ['hour', 'day', 'week', 'month', 'year', 'all'] as const;
export type TimeFilter = (typeof TIME_FILTERS)[number];

export const TIME_LABELS: Record<TimeFilter, string> = {
  hour: 'past hour',
  day: 'past 24 hours',
  week: 'past week',
  month: 'past month',
  year: 'past year',
  all: 'all time',
};

const parseTime = (value: SearchParamValue): TimeFilter => {
  const raw = first(value);
  return TIME_FILTERS.includes(raw as TimeFilter) ? (raw as TimeFilter) : 'all';
};

const parsePage = (value: SearchParamValue): number => {
  const page = Number(first(value));
  return Number.isInteger(page) && page >= 1 && page <= MAX_PAGE ? page : 1;
};

/* ── feeds (/ and /p/[community]) ── */

/** The archive can't compute Seedit's hot/active, so its tabs are new, top and comments. */
export const FEED_SORTS = ['new', 'top', 'comments'] as const;
export type FeedSort = (typeof FEED_SORTS)[number];

export interface FeedState {
  sort: FeedSort;
  /** Only meaningful for top. */
  time: TimeFilter;
  page: number;
}

export function parseFeedState(params: RawSearchParams): FeedState {
  const raw = first(params.sort);
  const sort = FEED_SORTS.includes(raw as FeedSort) ? (raw as FeedSort) : 'new';
  return { sort, time: sort === 'top' ? parseTime(params.t) : 'all', page: parsePage(params.page) };
}

export const isDefaultFeedState = (state: FeedState) => state.sort === 'new' && state.page === 1;

/** A header tab (Seedit's li.selected / li.choice). */
export interface Tab {
  label: string;
  href: string;
  selected: boolean;
}

/** Seedit's sort tabs, reduced to the sorts the archive API can compute. */
export function feedTabs(basePath: string, state: FeedState): Tab[] {
  return [
    { label: 'new', href: feedHref(basePath, { sort: 'new' }), selected: state.sort === 'new' },
    { label: 'top', href: feedHref(basePath, { sort: 'top', time: state.sort === 'top' ? state.time : 'all' }), selected: state.sort === 'top' },
    { label: 'comments', href: feedHref(basePath, { sort: 'comments' }), selected: state.sort === 'comments' },
  ];
}

export function feedHref(basePath: string, state: Partial<FeedState>): string {
  const params = new URLSearchParams();
  if (state.sort && state.sort !== 'new') params.set('sort', state.sort);
  if (state.sort === 'top' && state.time && state.time !== 'all') params.set('t', state.time);
  if (state.page && state.page > 1) params.set('page', String(state.page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/** /api/posts query for a feed page. */
export function feedApiQuery(state: FeedState, community?: string): string {
  const params = new URLSearchParams({ sort: state.sort === 'comments' ? 'replies' : state.sort, limit: String(FEED_PAGE_SIZE) });
  if (state.sort === 'top' && state.time !== 'all') params.set('time', state.time);
  if (state.page > 1) params.set('page', String(state.page));
  if (community) params.set('community', community);
  return `?${params.toString()}`;
}

/* ── search (/search) ── */

/** Seedit's search "sorted by" choices; relevance is the API default. */
export const SEARCH_SORTS = ['relevance', 'top', 'new', 'comments'] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

export interface SearchState {
  query: string;
  sort: SearchSort;
  time: TimeFilter;
  page: number;
}

export function parseSearchState(params: RawSearchParams): SearchState {
  const raw = first(params.sort);
  return {
    query: (first(params.q) ?? '').trim().slice(0, 200),
    sort: SEARCH_SORTS.includes(raw as SearchSort) ? (raw as SearchSort) : 'relevance',
    time: parseTime(params.t),
    page: parsePage(params.page),
  };
}

export function searchHref(state: SearchState): string {
  const params = new URLSearchParams({ q: state.query });
  if (state.sort !== 'relevance') params.set('sort', state.sort);
  if (state.time !== 'all') params.set('t', state.time);
  if (state.page > 1) params.set('page', String(state.page));
  return `/search?${params.toString()}`;
}

/** Extra /api/search parameters (the query itself is added by lib/api.ts). */
export function searchApiOptions(state: SearchState): Record<string, string> {
  const options: Record<string, string> = { limit: String(FEED_PAGE_SIZE) };
  if (state.sort !== 'relevance') options.sort = state.sort === 'comments' ? 'replies' : state.sort;
  if (state.time !== 'all') options.time = state.time;
  if (state.page > 1) options.page = String(state.page);
  return options;
}

/* ── thread reply sort (/c/[cid]) ── */

export const REPLY_SORTS = ['best', 'new', 'old'] as const;
export type ReplySort = (typeof REPLY_SORTS)[number];

export function parseReplySort(params: RawSearchParams): ReplySort {
  const raw = first(params.sort);
  return REPLY_SORTS.includes(raw as ReplySort) ? (raw as ReplySort) : 'best';
}

export const replySortHref = (path: string, sort: ReplySort) => (sort === 'best' ? path : `${path}?sort=${sort}`);
