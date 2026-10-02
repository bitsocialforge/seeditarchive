import Link from 'next/link';
import { feedHref, type FeedState, TIME_FILTERS, TIME_LABELS, type TimeFilter } from '@/lib/listing';
import type { Comment } from '@/lib/types';
import ax from '@/styles/archive.module.css';
import emptyFeed from '@/styles/seedit/components/empty-feed-message.module.css';
import feedFooter from '@/styles/seedit/components/feed-footer.module.css';
import pagination from '@/styles/seedit/components/feed-pagination.module.css';
import topTimeFilter from '@/styles/seedit/components/top-time-filter.module.css';
import { PostRow } from './PostRow';

/** Seedit's EmptyFeedMessage. */
export function EmptyFeedMessage({ children = "There doesn't seem to be anything here" }: { children?: string }) {
  return <div className={emptyFeed.message}>{children}</div>;
}

/** Seedit's "links from:" menu for the top sort (src/components/top-time-filter). */
export function TopTimeFilter({ selected, hrefFor }: { selected: TimeFilter; hrefFor: (time: TimeFilter) => string }) {
  return (
    <div className={topTimeFilter.menuArea}>
      <span>links from:</span>
      <details className={topTimeFilter.dropdown}>
        <summary>{TIME_LABELS[selected]}</summary>
        <div className={topTimeFilter.dropChoices}>
          {TIME_FILTERS.filter((time) => time !== selected).map((time) => (
            <Link key={time} href={hrefFor(time)}>
              {TIME_LABELS[time]}
            </Link>
          ))}
        </div>
      </details>
    </div>
  );
}

/**
 * Seedit appends pages with a "Load more" button; server-rendered pages use
 * old reddit's "view more: ‹ prev | next ›" links in that button's style.
 */
export function Pagination({ prevHref, nextHref }: { prevHref?: string; nextHref?: string }) {
  if (!prevHref && !nextHref) return null;
  return (
    <nav className={`${pagination.loadMoreContainer} ${ax.pagination}`} aria-label="pagination">
      view more:{' '}
      {prevHref ? (
        <Link href={prevHref} className={pagination.loadMore} rel="prev">
          ‹ prev
        </Link>
      ) : null}
      {prevHref && nextHref ? <span className={ax.paginationSeparator} aria-hidden /> : null}
      {nextHref ? (
        <Link href={nextHref} className={pagination.loadMore} rel="next">
          next ›
        </Link>
      ) : null}
    </nav>
  );
}

interface FeedProps {
  posts: Comment[];
  basePath: string;
  state: FeedState;
  total: number;
  pageSize: number;
  showCommunity: boolean;
  emptyMessage?: string;
}

/** A Seedit feed: optional top-time menu, ranked post rows and the feed footer. */
export function Feed({ posts, basePath, state, total, pageSize, showCommunity, emptyMessage }: FeedProps) {
  const offset = (state.page - 1) * pageSize;
  const prevHref = state.page > 1 ? feedHref(basePath, { ...state, page: state.page - 1 }) : undefined;
  const nextHref = offset + posts.length < total && posts.length > 0 ? feedHref(basePath, { ...state, page: state.page + 1 }) : undefined;
  return (
    <>
      {state.sort === 'top' ? (
        <TopTimeFilter selected={state.time} hrefFor={(time) => feedHref(basePath, { sort: 'top', time })} />
      ) : null}
      {posts.map((post, index) => (
        <PostRow key={post.cid} post={post} rank={offset + index + 1} showCommunity={showCommunity} />
      ))}
      <div className={feedFooter.footer}>
        {posts.length === 0 ? <EmptyFeedMessage>{emptyMessage}</EmptyFeedMessage> : null}
        <Pagination prevHref={prevHref} nextHref={nextHref} />
      </div>
    </>
  );
}
