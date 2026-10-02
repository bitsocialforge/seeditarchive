import { getPosts } from './api';
import { FEED_PAGE_SIZE, feedApiQuery, type FeedState } from './listing';
import type { Comment, PostPage } from './types';

/** The API caps a page at this many posts. */
const API_PAGE_LIMIT = 100;

/** The API's own orderings (bitsocial-indexer ORDER_BY), so a merged page reads as one listing. */
const COMPARE: Record<FeedState['sort'], (a: Comment, b: Comment) => number> = {
  new: (a, b) => b.timestamp - a.timestamp,
  top: (a, b) => b.upvote_count - b.downvote_count - (a.upvote_count - a.downvote_count) || b.timestamp - a.timestamp,
  comments: (a, b) => b.reply_count - a.reply_count || b.timestamp - a.timestamp,
};

/** One API page of a community's feed, in the feed's sort and time window. */
function communityPage(address: string, state: FeedState, page: number, limit: number) {
  const params = new URLSearchParams(feedApiQuery({ ...state, page: 1 }, address).slice(1));
  params.set('limit', String(limit));
  if (page > 1) params.set('page', String(page));
  else params.delete('page');
  return getPosts(`?${params.toString()}`, 300);
}

/**
 * One feed page across several communities (a Seedit short route's
 * candidates). Page N needs the first N×25 posts of the union, which are among
 * the first N×25 of each community, so each is read that far and the results
 * merged in the API's own order. One community pages through the API directly.
 */
export async function mergedFeed(boards: string[], state: FeedState): Promise<Pick<PostPage, 'posts' | 'total'> | null> {
  if (boards.length === 1) return getPosts(feedApiQuery(state, boards[0]), 300);

  const need = state.page * FEED_PAGE_SIZE;
  const perBoard = await Promise.all(
    boards.map(async (address) => {
      const posts: Comment[] = [];
      let total = 0;
      for (let page = 1; posts.length < need; page++) {
        const res = await communityPage(address, state, page, API_PAGE_LIMIT);
        if (!res) return null;
        total = res.total;
        posts.push(...res.posts);
        if (res.posts.length < API_PAGE_LIMIT) break;
      }
      return { posts, total };
    }),
  );
  if (perBoard.every((b) => b === null)) return null;

  const posts = perBoard
    .flatMap((b) => b?.posts ?? [])
    .sort(COMPARE[state.sort])
    .slice((state.page - 1) * FEED_PAGE_SIZE, state.page * FEED_PAGE_SIZE);
  return { posts, total: perBoard.reduce((sum, b) => sum + (b?.total ?? 0), 0) };
}
