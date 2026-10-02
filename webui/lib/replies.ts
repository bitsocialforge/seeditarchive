import { getCommentMeta } from './comment-meta';
import type { ReplySort } from './listing';
import { sortByBest } from './seedit';
import type { Comment } from './types';

export interface ReplyNode {
  reply: Comment;
  children: ReplyNode[];
  /** Every reply below this one, the count Seedit shows on a collapsed reply. */
  descendantCount: number;
}

/** Seedit's post-page order: pinned replies first (newest first), then the chosen sort. */
function sortSiblings(nodes: ReplyNode[], sort: ReplySort): ReplyNode[] {
  const pinned: ReplyNode[] = [];
  const rest: ReplyNode[] = [];
  for (const node of nodes) (getCommentMeta(node.reply).pinned ? pinned : rest).push(node);
  pinned.sort((a, b) => b.reply.timestamp - a.reply.timestamp);
  let sorted: ReplyNode[];
  if (sort === 'best') {
    const byCid = new Map(rest.map((node) => [node.reply.cid, node]));
    sorted = sortByBest(rest.map((node) => node.reply)).map((reply) => byCid.get(reply.cid)!);
  } else {
    sorted = [...rest].sort((a, b) => (sort === 'new' ? b.reply.timestamp - a.reply.timestamp : a.reply.timestamp - b.reply.timestamp));
  }
  return [...pinned, ...sorted];
}

/**
 * Nest the API's flat reply list (parent_cid/depth) under `rootCid`, the
 * thread's post or, for a single-comment view, one reply. On a post, a reply
 * whose parent is not in the list is kept at the top level instead of being
 * dropped.
 */
export function buildReplyTree(replies: readonly Comment[], rootCid: string, sort: ReplySort, isPostRoot: boolean): ReplyNode[] {
  const nodes = new Map<string, ReplyNode>();
  for (const reply of replies) {
    if (reply.cid !== rootCid && !nodes.has(reply.cid)) nodes.set(reply.cid, { reply, children: [], descendantCount: 0 });
  }
  const roots: ReplyNode[] = [];
  for (const node of nodes.values()) {
    const parentCid = node.reply.parent_cid;
    const parent = parentCid ? nodes.get(parentCid) : undefined;
    if (parentCid === rootCid) roots.push(node);
    else if (parent) parent.children.push(node);
    else if (isPostRoot) roots.push(node);
  }
  // Sort each sibling list and count descendants. A parent cycle never reaches
  // the roots, so it is never visited.
  const visit = (list: ReplyNode[]): ReplyNode[] => {
    const sorted = sortSiblings(list, sort);
    for (const node of sorted) {
      node.children = visit(node.children);
      node.descendantCount = node.children.reduce((sum, child) => sum + 1 + child.descendantCount, 0);
    }
    return sorted;
  };
  return visit(roots);
}
