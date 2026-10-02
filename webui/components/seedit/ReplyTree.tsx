import Link from 'next/link';
import { type CommentMeta, getCommentMeta } from '@/lib/comment-meta';
import { getHasThumbnail, getMediaInfo } from '@/lib/media';
import { postPath } from '@/lib/paths';
import type { ReplyNode } from '@/lib/replies';
import { formatScore, getHostname, getReplyScore, getShortAddress, safeHttpUrl, UGC_REL } from '@/lib/seedit';
import { isTombstone, tombstoneTitle } from '@/lib/tombstone';
import type { Comment } from '@/lib/types';
import ax from '@/styles/archive.module.css';
import tools from '@/styles/seedit/components/comment-tools.module.css';
import styles from '@/styles/seedit/components/reply.module.css';
import { Flair, Label } from './Labels';
import { Markdown } from './Markdown';
import { TimeAgo } from './PostRow';
import { TombstoneNote } from './Tombstone';
import { Thumbnail } from './Thumbnail';

/** Seedit stops nesting here and links to the reply's own page instead. */
const MAX_DEPTH = 9;

function ReplyAuthor({ reply, submitterAddress, postCid }: { reply: Comment; submitterAddress?: string | null; postCid: string }) {
  if (isTombstone(reply)) return <span className={`${styles.removedUsername} ${ax.collapsedMuted}`}>{tombstoneTitle(reply)}</span>;
  const shortAddress = getShortAddress(reply.author_address);
  const displayName = reply.author_name?.trim();
  const shortDisplayName = displayName && displayName.length > 20 ? `${displayName.slice(0, 20)}...` : displayName;
  const isSubmitter = Boolean(reply.author_address && reply.author_address === submitterAddress);
  const authorClass = `${styles.author} ${isSubmitter ? styles.submitter : ''} ${ax.collapsedMuted}`;
  return (
    <>
      {shortDisplayName ? <span className={authorClass}>{shortDisplayName} </span> : null}
      <span className={authorClass}>{shortDisplayName ? `u/${shortAddress}` : shortAddress || '[deleted]'}</span>
      {isSubmitter ? (
        <span className={`${styles.moderatorBrackets} ${ax.collapsedMuted}`}>
          {' '}
          [
          <Link href={postPath(postCid)} className={styles.submitter} title="submitter">
            S
          </Link>
          ]
        </span>
      ) : null}
    </>
  );
}

/** Seedit's ReplyMedia, without the in-place expansion: media links open in a new tab. */
function ReplyMedia({ reply, meta }: { reply: Comment; meta: CommentMeta }) {
  const media = getMediaInfo(reply.link, reply.thumbnail_url);
  const link = safeHttpUrl(reply.link);
  if (!media || !link) return null;
  if (getHasThumbnail(media) && media.type !== 'webpage' && media.type !== 'iframe') {
    return (
      <Thumbnail
        media={media}
        href={link}
        isReply
        isLink={false}
        isText={false}
        isNsfw={meta.nsfw}
        isSpoiler={meta.spoiler}
        linkWidth={meta.linkWidth}
        linkHeight={meta.linkHeight}
      />
    );
  }
  return (
    <>
      <a href={link} target="_blank" rel={UGC_REL}>
        ({getHostname(link) || link})
      </a>
      <br />
      <br />
    </>
  );
}

interface TaglineProps {
  node: ReplyNode;
  meta: CommentMeta;
  toggleId: string;
  postCid: string;
  submitterAddress?: string | null;
}

/** Seedit's reply tagline: [–], author, points, age, and the child count once collapsed. */
function ReplyTagline({ node, meta, toggleId, postCid, submitterAddress }: TaglineProps) {
  const { reply, descendantCount } = node;
  const score = getReplyScore(reply.upvote_count, reply.downvote_count);
  return (
    <p className={styles.tagline}>
      <label htmlFor={toggleId} className={styles.expand}>
        <span className={ax.whenUnchecked} aria-hidden>
          [–]
        </span>
        <span className={ax.whenChecked} aria-hidden>
          [+]
        </span>
        <span className={ax.srOnly}>collapse reply</span>
      </label>
      <ReplyAuthor reply={reply} submitterAddress={submitterAddress} postCid={postCid} />
      <span className={`${styles.score} ${ax.collapsedMuted}`}>{score === 1 ? '1 point' : `${formatScore(score)} points`}</span>{' '}
      <span className={`${styles.time} ${ax.collapsedMuted}`}>
        <TimeAgo timestamp={reply.timestamp} />
      </span>
      {meta.pinned ? <span className={styles.pinned}> - stickied comment</span> : null}
      <span className={`${styles.children} ${ax.whenChecked} ${ax.collapsedMuted}`}>
        {' '}
        ({descendantCount} {descendantCount === 1 ? 'child' : 'children'})
      </span>
      {meta.flair ? (
        <span className={ax.whenUnchecked}>
          {' '}
          <Flair flair={meta.flair} />
        </span>
      ) : null}
    </p>
  );
}

function ReplyText({ reply, meta, highlighted }: { reply: Comment; meta: CommentMeta; highlighted: boolean }) {
  const tombstone = isTombstone(reply);
  const mdClass = `${styles.md} ${highlighted ? styles.highlightContent : ''} ${tombstone ? styles.removedOrDeletedContent : ''}`;
  return (
    <div className={`${styles.usertext} ${ax.replyContent}`}>
      {tombstone ? null : <ReplyMedia reply={reply} meta={meta} />}
      <div className={mdClass}>
        {tombstone ? <TombstoneNote comment={reply} variant="reply" /> : reply.content ? <Markdown content={reply.content} /> : null}
      </div>
    </div>
  );
}

/** Seedit's reply tools, reduced to the permalink (Seedit shows none on removed/deleted replies). */
function ReplyButtons({ reply, meta }: { reply: Comment; meta: CommentMeta }) {
  if (isTombstone(reply)) return null;
  return (
    <ul className={`${tools.buttons} ${tools.buttonsReply}`}>
      {meta.spoiler ? <Label color="black" text="spoiler" first /> : null}
      {meta.nsfw ? <Label color="red" text="nsfw" first={!meta.spoiler} /> : null}
      <li className={`${tools.button} ${meta.spoiler || meta.nsfw ? '' : tools.firstButton}`}>
        <Link href={postPath(reply.cid)}>permalink</Link>
      </li>
    </ul>
  );
}

interface ReplyProps {
  node: ReplyNode;
  depth: number;
  postCid: string;
  submitterAddress?: string | null;
  /** The reply a single-comment page is about, highlighted like Seedit's context reply. */
  highlightCid?: string;
}

/**
 * Server port of Seedit's Reply (src/components/reply/reply.tsx) with its
 * nesting, tagline, markdown body and permalink. [–] is a checkbox label, so
 * collapsing works without JavaScript.
 */
export function Reply({ node, depth, postCid, submitterAddress, highlightCid }: ReplyProps) {
  const { reply, children } = node;
  const meta = getCommentMeta(reply);
  const toggleId = `c-${reply.cid}`;
  const nested = depth < MAX_DEPTH;
  return (
    <div className="reply" id={reply.cid}>
      <div className={`${styles.replyWrapper} ${depth > 0 ? styles.nested : ''} ${ax.relative}`}>
        <input type="checkbox" id={toggleId} className={`${ax.toggle} ${ax.collapseToggle}`} />
        <div className={`${styles.midcol} ${isTombstone(reply) ? styles.hiddenMidcol : ''} ${ax.replyMidcol}`} aria-hidden>
          <div className={`${styles.arrow} ${styles.arrowUp} ${ax.inert}`} />
          <div className={`${styles.arrow} ${styles.arrowDown} ${ax.inert}`} />
        </div>
        <div className={ax.replyBody}>
          <div className={`${styles.entry} ${ax.replyEntry}`}>
            <ReplyTagline node={node} meta={meta} toggleId={toggleId} postCid={postCid} submitterAddress={submitterAddress} />
            <ReplyText reply={reply} meta={meta} highlighted={highlightCid === reply.cid} />
          </div>
          <div className={ax.replyContent}>
            <ReplyButtons reply={reply} meta={meta} />
            {nested
              ? children.map((child) => (
                  <Reply
                    key={child.reply.cid}
                    node={child}
                    depth={depth + 1}
                    postCid={postCid}
                    submitterAddress={submitterAddress}
                    highlightCid={highlightCid}
                  />
                ))
              : null}
            {!nested && children.length > 0 ? (
              <div className={styles.continueThisThread}>
                <Link href={postPath(reply.cid)}>continue this thread</Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
