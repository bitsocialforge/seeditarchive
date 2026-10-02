import type { Metadata } from 'next';
import Link from 'next/link';
import { ApiDown } from '@/components/Notice';
import { Chrome } from '@/components/seedit/Chrome';
import { Feed } from '@/components/seedit/Feed';
import { CommunityList, CommunityTitleBox, LargeButton, Sidebar, SidebarSearch } from '@/components/seedit/Sidebar';
import { getCommunities, getCommunity, getPosts } from '@/lib/api';
import { excerpt } from '@/lib/format';
import { FEED_PAGE_SIZE, feedApiQuery, feedTabs, isDefaultFeedState, parseFeedState, type RawSearchParams } from '@/lib/listing';
import { communityPath, seeditCommunityUrl } from '@/lib/paths';
import { getShortDisplayAddress } from '@/lib/seedit';
import layout from '@/styles/seedit/components/feed-layout.module.css';

// Cache the rendered page; identical fetches are deduped with generateMetadata.
export const revalidate = 300;

type Params = { params: Promise<{ community: string }>; searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const { community } = await params;
  const address = decodeURIComponent(community);
  const [meta, state] = await Promise.all([getCommunity(address), searchParams.then(parseFeedState)]);

  const title = meta?.title ?? address;
  const description = excerpt(meta?.description) || `Indexed posts from ${address}.`;
  const canonical = `/p/${encodeURIComponent(address)}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical },
    twitter: { card: 'summary', title, description },
    // Other sorts and deeper pages repeat the community's posts: crawl them, don't index them.
    robots: isDefaultFeedState(state) ? undefined : { index: false, follow: true },
  };
}

export default async function CommunityPage({ params, searchParams }: Params) {
  const { community } = await params;
  const address = decodeURIComponent(community);
  const state = parseFeedState(await searchParams);
  const basePath = communityPath(address);

  const [meta, page, communitiesRes] = await Promise.all([
    getCommunity(address),
    getPosts(feedApiQuery(state, address), 300),
    getCommunities(),
  ]);

  const chrome = (
    <Chrome
      active={address}
      pageNameIsHeading
      pageName={<Link href={basePath}>{meta?.title || getShortDisplayAddress(address) || address}</Link>}
      tabs={feedTabs(basePath, state)}
    />
  );

  if (page === null) {
    return (
      <>
        {chrome}
        <div className={layout.content}>
          <ApiDown />
        </div>
      </>
    );
  }

  return (
    <>
      {chrome}
      <div className={layout.content}>
        <div className={layout.sidebar}>
          <Sidebar>
            <SidebarSearch />
            <LargeButton href={seeditCommunityUrl(address)}>Open in Seedit</LargeButton>
            <CommunityTitleBox community={meta} address={address} />
            <CommunityList communities={communitiesRes?.communities ?? []} active={address} />
          </Sidebar>
        </div>
        <div className={layout.feed}>
          <Feed
            posts={page.posts}
            basePath={basePath}
            state={state}
            total={page.total}
            pageSize={FEED_PAGE_SIZE}
            showCommunity={false}
            emptyMessage={isDefaultFeedState(state) ? 'No posts indexed for this community yet.' : undefined}
          />
        </div>
      </div>
    </>
  );
}
