import type { Metadata } from 'next';
import Link from 'next/link';
import { permanentRedirect } from 'next/navigation';
import { ApiDown } from '@/components/Notice';
import { Chrome } from '@/components/seedit/Chrome';
import { Feed } from '@/components/seedit/Feed';
import { CommunityList, DirectoryTitleBox, LargeButton, Sidebar, SidebarSearch } from '@/components/seedit/Sidebar';
import { getCommunities } from '@/lib/api';
import { archivedBoards, codePath, type Directory, getDirectory, seeditCodeUrl } from '@/lib/directories';
import { mergedFeed } from '@/lib/feed';
import { FEED_PAGE_SIZE, feedTabs, isDefaultFeedState, parseFeedState, type RawSearchParams } from '@/lib/listing';
import { communityPath } from '@/lib/paths';
import layout from '@/styles/seedit/components/feed-layout.module.css';

// Cache the rendered page, like the community pages.
export const revalidate = 300;

type Params = { params: Promise<{ segment: string }>; searchParams: Promise<RawSearchParams> };

/**
 * /s/<segment>, as in Seedit: a short route (/s/news) is a code page; /s/all is
 * the front page; anything else is a community address, whose archive page is
 * /p/<address> — so a Seedit URL with its host swapped lands somewhere real.
 */
function resolveCode(segment: string): Directory {
  const dir = getDirectory(segment);
  if (dir) return dir;
  if (segment === 'all') permanentRedirect('/');
  permanentRedirect(communityPath(segment));
}

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const dir = resolveCode(decodeURIComponent((await params).segment));
  const state = parseFeedState(await searchParams);
  const title = `s/${dir.code}: ${dir.title}`;
  const description = dir.description ?? `Archived posts from every community competing for Seedit's s/${dir.code}.`;
  const canonical = codePath(dir.code);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical },
    twitter: { card: 'summary', title, description },
    robots: isDefaultFeedState(state) ? undefined : { index: false, follow: true },
  };
}

export default async function CodePage({ params, searchParams }: Params) {
  const dir = resolveCode(decodeURIComponent((await params).segment));
  const state = parseFeedState(await searchParams);
  const basePath = codePath(dir.code);

  const communities = (await getCommunities())?.communities ?? null;
  const known = new Map((communities ?? []).map((c) => [c.address, c]));
  // A community with nothing archived would only cost a request.
  const boards = communities ? archivedBoards(dir).filter((address) => (known.get(address)?.post_count ?? 0) > 0) : archivedBoards(dir);
  const page = boards.length > 0 ? await mergedFeed(boards, state) : { posts: [], total: 0 };

  return (
    <>
      <Chrome
        active={dir.code}
        pageNameIsHeading
        pageName={<Link href={basePath}>{dir.title}</Link>}
        tabs={feedTabs(basePath, state)}
      />
      <div className={layout.content}>
        {page === null ? (
          <ApiDown />
        ) : (
          <>
            <div className={layout.sidebar}>
              <Sidebar>
                <SidebarSearch />
                <LargeButton href={seeditCodeUrl(dir.code)}>Open in Seedit</LargeButton>
                <DirectoryTitleBox dir={dir} communities={known} />
                <CommunityList communities={communities ?? []} />
              </Sidebar>
            </div>
            <div className={layout.feed}>
              <Feed
                posts={page.posts}
                basePath={basePath}
                state={state}
                total={page.total}
                pageSize={FEED_PAGE_SIZE}
                showCommunity
                emptyMessage={isDefaultFeedState(state) ? `No posts archived for s/${dir.code} yet.` : undefined}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
