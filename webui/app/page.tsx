import type { Metadata } from 'next';
import { EmptyState } from '@/components/EmptyState';
import { ApiDown } from '@/components/Notice';
import { Chrome } from '@/components/seedit/Chrome';
import { Feed } from '@/components/seedit/Feed';
import { ArchiveTitleBox, CommunityList, LargeButton, Sidebar, SidebarSearch, SidebarSubtitles } from '@/components/seedit/Sidebar';
import { getCommunities, getHealth, getPosts } from '@/lib/api';
import { FEED_PAGE_SIZE, feedApiQuery, feedTabs, isDefaultFeedState, parseFeedState, type RawSearchParams } from '@/lib/listing';
import { siteName } from '@/lib/site';
import ax from '@/styles/archive.module.css';
import layout from '@/styles/seedit/components/feed-layout.module.css';

// Render at request time (never bake an "API down" page into the build); the
// fetches themselves are cached in the data cache (see lib/api.ts).
export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const state = parseFeedState(await searchParams);
  return {
    alternates: { canonical: '/' },
    openGraph: { url: '/' },
    // Other sorts and deeper pages repeat the front page's posts: crawl them, don't index them.
    robots: isDefaultFeedState(state) ? undefined : { index: false, follow: true },
  };
}

export default async function Home({ searchParams }: Props) {
  const state = parseFeedState(await searchParams);
  const [health, communitiesRes] = await Promise.all([getHealth(), getCommunities()]);
  const chrome = <Chrome active="home" tabs={feedTabs('/', state)} />;

  if (!health) {
    return (
      <>
        {chrome}
        <div className={layout.content}>
          <ApiDown />
        </div>
      </>
    );
  }

  const communities = communitiesRes?.communities ?? [];
  if (communities.length === 0) {
    return (
      <>
        <Chrome active="home" />
        <EmptyState />
      </>
    );
  }

  const page = await getPosts(feedApiQuery(state));

  return (
    <>
      {chrome}
      <div className={layout.content}>
        <div className={layout.sidebar}>
          <Sidebar>
            <SidebarSearch />
            <LargeButton href="https://seedit.app">Browse live on Seedit</LargeButton>
            <ArchiveTitleBox health={health} />
            <CommunityList communities={communities} />
            <SidebarSubtitles />
          </Sidebar>
        </div>
        <div className={layout.feed}>
          <h1 className={ax.srOnly}>
            {siteName}: {state.sort === 'new' ? 'recent' : state.sort === 'top' ? 'top' : 'most commented'} posts across {communities.length}{' '}
            communities
          </h1>
          {page === null ? (
            <ApiDown />
          ) : (
            <Feed
              posts={page.posts}
              basePath="/"
              state={state}
              total={page.total}
              pageSize={FEED_PAGE_SIZE}
              showCommunity
              emptyMessage={isDefaultFeedState(state) ? 'Communities are configured, but nothing has been indexed yet.' : undefined}
            />
          )}
        </div>
      </div>
    </>
  );
}
