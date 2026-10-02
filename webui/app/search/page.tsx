import type { Metadata } from 'next';
import { ApiDown } from '@/components/Notice';
import { Chrome } from '@/components/seedit/Chrome';
import { SearchPane, SearchResultGroup } from '@/components/seedit/SearchResults';
import { ArchiveTitleBox, CommunityList, Sidebar, SidebarSubtitles } from '@/components/seedit/Sidebar';
import { getCommunities, getHealth, search } from '@/lib/api';
import { FEED_PAGE_SIZE, parseSearchState, type RawSearchParams, searchApiOptions } from '@/lib/listing';
import layout from '@/styles/seedit/components/feed-layout.module.css';
import view from '@/styles/seedit/views/search.module.css';
import header from '@/styles/seedit/components/header.module.css';

type SearchParams = { searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ searchParams }: SearchParams): Promise<Metadata> {
  const { query } = parseSearchState(await searchParams);
  return {
    title: query ? `${query} — search` : 'Search',
    alternates: { canonical: '/search' },
    // Result pages are infinite query-space; keep them out of the index.
    robots: query ? { index: false, follow: true } : undefined,
  };
}

export default async function SearchPage({ searchParams }: SearchParams) {
  const state = parseSearchState(await searchParams);
  const [result, health, communitiesRes] = await Promise.all([
    state.query ? search(state.query, searchApiOptions(state)) : Promise.resolve(null),
    getHealth(),
    getCommunities(),
  ]);
  const apiDown = state.query !== '' && result === null;

  return (
    <>
      <Chrome pageNameIsHeading pageName={<span className={header.lowercase}>search results</span>} />
      <div className={layout.content}>
        <div className={layout.sidebar}>
          <Sidebar>
            <ArchiveTitleBox health={health} />
            <CommunityList communities={communitiesRes?.communities ?? []} />
            <SidebarSubtitles />
          </Sidebar>
        </div>
        <div className={view.listing}>
          <SearchPane state={state} />
          {apiDown ? <ApiDown /> : null}
          {state.query && result ? (
            <SearchResultGroup state={state} posts={result.posts} total={result.total} pageSize={FEED_PAGE_SIZE} />
          ) : !apiDown ? (
            <p className={`${view.info} ${view.providedBy}`}>Search the indexed communities.</p>
          ) : null}
        </div>
      </div>
    </>
  );
}
