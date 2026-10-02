import { isTombstone, tombstoneTitle } from './tombstone';
import type { Comment } from './types';

/** Seedit's feed title: the title, else the start of the body, else a dash. */
export function postTitle(post: Comment): string {
  if (isTombstone(post)) return tombstoneTitle(post);
  const title = post.title && post.title.length > 300 ? `${post.title.slice(0, 300)}...` : post.title;
  const body = post.content && post.content.length > 300 ? `${post.content.slice(0, 300)}...` : post.content;
  const text = title || body?.replace('&nbsp;', ' ').replace('>', '').replace('<', '').trim();
  return text?.trim() || '-';
}

/** Seedit's comment-count button text ("comment" when there are none). */
export function commentCount(replyCount: number): string {
  if (!replyCount) return 'comment';
  return `${replyCount} ${replyCount === 1 ? 'comment' : 'comments'}`;
}
