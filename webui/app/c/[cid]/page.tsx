import type { Metadata } from 'next';
import Link from 'next/link';
import { Chrome } from '@/components/seedit/Chrome';
import { PostRow } from '@/components/seedit/PostRow';
import { Reply } from '@/components/seedit/ReplyTree';
import { CommunityTitleBox, LargeButton, PostInfo, Sidebar, SidebarSearch } from '@/components/seedit/Sidebar';
import { getCommunity, getThread } from '@/lib/api';
import { getCommentMeta } from '@/lib/comment-meta';
import { excerpt } from '@/lib/format';
import { parseReplySort, REPLY_SORTS, type ReplySort, replySortHref, type RawSearchParams } from '@/lib/listing';
import { communityPath, postPath, seeditPostUrl } from '@/lib/paths';
import { buildReplyTree, type ReplyNode } from '@/lib/replies';
import { getShortDisplayAddress } from '@/lib/seedit';
import { isTombstone } from '@/lib/tombstone';
import type { Comment, Community } from '@/lib/types';
import ax from '@/styles/archive.module.css';
import notFound from '@/styles/seedit/views/not-found.module.css';
import view from '@/styles/seedit/views/post.module.css';

// Threads are archived content: cache the page, revalidate for late replies.
export const revalidate = 300;

type Params = { params: Promise<{ cid: string }>; searchParams: Promise<RawSearchParams> };

function threadTitle(post: Comment): string {
  if (post.takedown || post.removed) return '[removed]';
  if (post.deleted) return '[deleted]';
  return post.title || excerpt(post.content, 70) || 'untitled';
}

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const { cid } = await params;
  const [thread, sort] = await Promise.all([getThread(decodeURIComponent(cid)), searchParams.then(parseReplySort)]);
  if (!thread) return { title: 'Post not found', robots: { index: false } };

  const { post } = thread;
  const title = threadTitle(post);
  const description =
    excerpt(post.content) || `A thread from ${post.community_address} with ${post.reply_count} replies.`;
  const canonical = `/c/${encodeURIComponent(post.cid)}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
      publishedTime: new Date(post.timestamp * 1000).toISOString(),
    },
    twitter: { card: 'summary', title, description },
    // Redacted tombstones have no content worth indexing; other reply orders repeat the default page.
    robots: isTombstone(post) ? { index: false } : sort !== 'best' ? { index: false, follow: true } : undefined,
  };
}

function NotFoundView() {
  return (
    <div className={notFound.content}>
      <div className={notFound.notFound}>
        <h1>page not found</h1>
        <p>Post not found, or the indexer API isn’t reachable.</p>
      </div>
    </div>
  );
}

/** Seedit's "sorted by:" menu, as links (each order is its own URL). */
function SortMenu({ path, selected }: { path: string; selected: string }) {
  return (
    <div className={view.spacer}>
      <span className={view.dropdownTitle}>sorted by: </span>
      <details className={`${view.dropdown} ${ax.inlineDetails}`}>
        <summary className={`${view.selected} ${ax.summary}`}>{selected}</summary>
        <div className={view.dropdownItems}>
          {REPLY_SORTS.map((sort) => (
            <Link key={sort} href={replySortHref(path, sort)} className={`${view.dropdownItem} ${ax.dropdownLink}`}>
              {sort}
            </Link>
          ))}
        </div>
      </details>
    </div>
  );
}

/** Seedit's locked/removed/deleted post infobar state. */
function lockedState(op: Comment | null): string {
  if (!op) return '';
  if (op.deleted) return 'deleted';
  if (getCommentMeta(op).locked) return 'locked';
  return op.removed || op.takedown ? 'removed' : '';
}

const commentsTitle = (count: number) => (count === 0 ? 'no comments (yet)' : count === 1 ? '1 comment' : `all ${count} comments`);

function ThreadSidebar({ op, comment, community }: { op: Comment | null; comment: Comment; community: Community | null }) {
  return (
    <div className={view.sidebar}>
      <Sidebar>
        <SidebarSearch />
        {op ? <PostInfo post={op} /> : null}
        <LargeButton href={seeditPostUrl(comment.community_address, comment.cid)}>View on Seedit</LargeButton>
        <CommunityTitleBox community={community} address={comment.community_address} />
      </Sidebar>
    </div>
  );
}

/** Seedit's "all N comments" title and sort menu, or its single-comment infobar. */
function ReplyAreaHeader({ comment, replyCount, sort }: { comment: Comment; replyCount: number; sort: ReplySort }) {
  if (comment.parent_cid) {
    return (
      <div className={view.singleCommentInfobar}>
        <div className={view.singleCommentInfobarText}>You are viewing a single comment&apos;s thread</div>
        <div className={view.singleCommentInfobarLink}>
          <Link href={postPath(comment.post_cid)}>View the rest of the comments</Link> →
        </div>
      </div>
    );
  }
  return (
    <>
      <div className={view.repliesTitle}>
        <h2 className={`${view.title} ${ax.repliesHeading}`}>{commentsTitle(replyCount)}</h2>
      </div>
      <div className={`${view.menuArea} ${ax.menuVisible}`}>
        <SortMenu path={postPath(comment.cid)} selected={sort} />
      </div>
    </>
  );
}

function ReplyList({ comment, op, tree }: { comment: Comment; op: Comment | null; tree: ReplyNode[] }) {
  if (comment.parent_cid) {
    const node = { reply: comment, children: tree, descendantCount: tree.reduce((sum, child) => sum + 1 + child.descendantCount, 0) };
    return <Reply node={node} depth={0} postCid={comment.post_cid} submitterAddress={op?.author_address} highlightCid={comment.cid} />;
  }
  if (tree.length === 0) return <div className={view.noReplies}>There doesn&apos;t seem to be anything here</div>;
  return tree.map((node) => <Reply key={node.reply.cid} node={node} depth={0} postCid={comment.cid} submitterAddress={comment.author_address} />);
}

export default async function ThreadPage({ params, searchParams }: Params) {
  const { cid } = await params;
  const [thread, sort] = await Promise.all([getThread(decodeURIComponent(cid)), searchParams.then(parseReplySort)]);

  if (thread === null) {
    return (
      <>
        <Chrome />
        <NotFoundView />
      </>
    );
  }

  const { post: comment, replies } = thread;
  // A reply's permalink shows Seedit's single-comment thread under its post.
  const isSingleComment = Boolean(comment.parent_cid);
  const [opThread, community] = await Promise.all([
    isSingleComment ? getThread(comment.post_cid) : Promise.resolve(thread),
    getCommunity(comment.community_address),
  ]);
  const op = opThread?.post ?? null;
  const tree = buildReplyTree(replies, comment.cid, sort, !isSingleComment);
  const locked = lockedState(op);
  const address = comment.community_address;

  return (
    <>
      <Chrome
        active={address}
        pageName={<Link href={communityPath(address)}>{community?.title || getShortDisplayAddress(address) || address}</Link>}
        tabs={[{ label: 'comments', href: postPath(op?.cid ?? comment.cid), selected: true }]}
      />
      <div className={view.content}>
        <ThreadSidebar op={op} comment={comment} community={community} />
        {locked ? (
          <div className={view.lockedInfobar}>
            <div className={view.lockedInfobarText}>This post is {locked}.</div>
          </div>
        ) : null}
        {op ? <PostRow post={op} isPostPage showCommunity /> : null}
        <div className={view.replyArea}>
          <ReplyAreaHeader comment={comment} replyCount={op?.reply_count ?? replies.length} sort={sort} />
          <div className={view.replies}>
            <ReplyList comment={comment} op={op} tree={tree} />
          </div>
        </div>
      </div>
    </>
  );
}
