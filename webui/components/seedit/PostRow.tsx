import Link from 'next/link';
import type { ReactNode } from 'react';
import { type CommentMeta, getCommentMeta } from '@/lib/comment-meta';
import { getHasThumbnail, getMediaInfo, type MediaInfo } from '@/lib/media';
import { communityPath, postPath, seeditPostUrl } from '@/lib/paths';
import { commentCount, postTitle } from '@/lib/post-display';
import {
  formatScore,
  getHostname,
  getPostScore,
  getShortAddress,
  getShortDisplayAddress,
  isoDate,
  safeHttpUrl,
  timeAgo,
  UGC_REL,
  utcTimestamp,
} from '@/lib/seedit';
import { isAuthorDeletion, isTombstone } from '@/lib/tombstone';
import type { Comment } from '@/lib/types';
import ax from '@/styles/archive.module.css';
import tools from '@/styles/seedit/components/comment-tools.module.css';
import expandButton from '@/styles/seedit/components/expand-button.module.css';
import expando from '@/styles/seedit/components/expando.module.css';
import styles from '@/styles/seedit/components/post.module.css';
import { Flair, Label } from './Labels';
import { Markdown } from './Markdown';
import { TombstoneNote } from './Tombstone';
import { Thumbnail } from './Thumbnail';

/** Seedit's post tagline author: display name, then u/short address. */
export function Author({ post, className }: { post: Comment; className?: string }) {
  const shortAddress = getShortAddress(post.author_address);
  const displayName = post.author_name?.trim();
  if (!shortAddress && !displayName) return <span className={className}>[deleted]</span>;
  const shortDisplayName = displayName && displayName.length > 20 ? `${displayName.slice(0, 20).trim()}...` : displayName;
  return (
    <span className={className}>
      {shortDisplayName ? <span className={styles.displayName}>{shortDisplayName} </span> : null}
      {shortAddress ? `u/${shortAddress}` : null}
    </span>
  );
}

/** Seedit's "N units ago" with the full UTC timestamp on hover. */
export function TimeAgo({ timestamp }: { timestamp: number }) {
  return (
    <time dateTime={isoDate(timestamp)} title={utcTimestamp(timestamp)}>
      {timeAgo(timestamp)}
    </time>
  );
}

/** Everything a row needs, derived once from the API row. */
interface PostView {
  post: Comment;
  meta: CommentMeta;
  tombstone: boolean;
  media?: MediaInfo;
  link?: string;
  content: string | null;
  hasThumbnail: boolean;
  /** An image/video/audio link the expando can show (not nsfw or spoiler). */
  previewable: boolean;
  hasExpando: boolean;
  canExpand: boolean;
  buttonType: 'playButton' | 'textButton';
}

const PREVIEW_TYPES = new Set(['image', 'gif', 'video', 'audio']);
const PLAY_TYPES = new Set(['audio', 'iframe', 'pdf']);

function getPostView(post: Comment, isPostPage: boolean): PostView {
  const tombstone = isTombstone(post);
  const meta = getCommentMeta(post);
  const media = tombstone ? undefined : getMediaInfo(post.link, post.thumbnail_url);
  const link = tombstone ? undefined : safeHttpUrl(post.link);
  const content = !tombstone && post.content?.trim() ? post.content : null;
  const hasThumbnail = getHasThumbnail(media);
  const previewable = Boolean(media && !meta.nsfw && !meta.spoiler && PREVIEW_TYPES.has(media.type));
  const hasExpando = Boolean(content || previewable || (isPostPage && tombstone));
  // Seedit's ExpandButton type; a webpage link with text gets the text button.
  const playable = hasThumbnail || PLAY_TYPES.has(media?.type ?? '');
  const buttonType = playable && !(media?.type === 'webpage' && content) ? 'playButton' : 'textButton';
  // Seedit's canExpandPost: a self post's text is simply shown on its own page.
  const canExpand = hasExpando && !(isPostPage && !link);
  return { post, meta, tombstone, media, link, content, hasThumbnail, previewable, hasExpando, canExpand, buttonType };
}

/** What the archive can show inside an expanded post: an image/video/audio preview. */
function MediaPreview({ media }: { media: MediaInfo }) {
  if (media.type === 'image' || media.type === 'gif') {
    return (
      <a href={media.url} target="_blank" rel={UGC_REL} aria-label="open the full image">
        {/* eslint-disable-next-line @next/next/no-img-element -- third-party archived media, not optimizable */}
        <img src={media.url} alt="" loading="lazy" />
      </a>
    );
  }
  if (media.type === 'video') return <video src={`${media.url}#t=0.001`} controls preload="none" playsInline />;
  if (media.type === 'audio') return <audio src={media.url} controls preload="none" />;
  return null;
}

/** Seedit's Expando: media preview and the self text in its rounded markdown box. */
function PostExpando({ view, id }: { view: PostView; id: string }) {
  return (
    <div className={`${expando.expando} ${view.canExpand ? ax.collapsible : ''} ${ax.expandoRow}`} id={id}>
      {view.previewable && view.media ? (
        <div className={expando.mediaPreview}>
          <MediaPreview media={view.media} />
        </div>
      ) : null}
      {view.content || view.tombstone ? (
        <div className={expando.usertext}>
          <div className={expando.markdown}>
            {view.tombstone ? <TombstoneNote comment={view.post} /> : <Markdown content={view.content ?? ''} />}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Domain({ hostname, communityAddress }: { hostname: string; communityAddress: string }) {
  return (
    <span className={styles.domain}>
      (
      {hostname ? (
        <span className={ax.domainText}>{hostname.length > 25 ? `${hostname.slice(0, 25)}...` : hostname}</span>
      ) : (
        <Link href={communityPath(communityAddress)}>self.{getShortDisplayAddress(communityAddress)}</Link>
      )}
      )
    </span>
  );
}

/** Seedit's title line: the title (an h1 on the post page), flair and domain. */
function TitleLine({ view, isPostPage }: { view: PostView; isPostPage: boolean }) {
  const { post, meta, link } = view;
  const linkClass = `${isPostPage ? (link ? styles.externalLink : styles.internalLink) : styles.link} ${meta.pinned ? styles.pinnedLink : ''} post-title`;
  const title = postTitle(post);
  const titleLink =
    isPostPage && link ? (
      <a href={link} className={linkClass} target="_blank" rel={UGC_REL}>
        {title}
      </a>
    ) : (
      <Link href={postPath(post.cid)} className={linkClass}>
        {title}
      </Link>
    );
  // A heading may not sit in a <p>: the post page wraps an inline h1 in a div with Seedit's title class.
  const TitleTag = isPostPage ? 'div' : 'p';
  return (
    <TitleTag className={styles.title}>
      {isPostPage ? <h1 className={ax.titleHeading}>{titleLink}</h1> : titleLink}
      {meta.flair ? (
        <>
          {' '}
          <Flair flair={meta.flair} />
        </>
      ) : null}{' '}
      <Domain hostname={link ? getHostname(link) : ''} communityAddress={post.community_address} />
    </TitleTag>
  );
}

function Tagline({ post, meta, showCommunity }: { post: Comment; meta: CommentMeta; showCommunity: boolean }) {
  return (
    <div className={styles.tagline}>
      submitted <TimeAgo timestamp={post.timestamp} /> by <Author post={post} className={`${styles.author} ${ax.taglineText}`} />
      {showCommunity ? (
        <>
          {' '}
          to{' '}
          <span className={styles.subscribeHoverGroup}>
            <Link className={styles.community} href={communityPath(post.community_address)}>
              s/{getShortDisplayAddress(post.community_address)}
            </Link>
          </span>
        </>
      ) : null}
      {meta.pinned ? <span className={styles.announcement}> - announcement</span> : null}
    </div>
  );
}

/** Seedit's CommentToolsLabel stamps. */
function postLabels(post: Comment, meta: CommentMeta): ReactNode[] {
  const labels: { key: string; color: string; title?: string }[] = [];
  if (meta.nsfw) labels.push({ key: 'nsfw', color: 'nsfw-red' });
  if (meta.spoiler) labels.push({ key: 'spoiler', color: 'black' });
  if (isTombstone(post)) labels.push({ key: isAuthorDeletion(post) ? 'deleted' : 'removed', color: 'red' });
  if (post.archived) labels.push({ key: 'archived', color: 'black', title: 'No longer live upstream — preserved by this archive' });
  return labels.map((label, index) => <Label key={label.key} color={label.color} text={label.key} first={index === 0} title={label.title} />);
}

/** Seedit's CommentTools, reduced to what works read-only: comments and the live thread. */
function PostButtons({ post, meta }: { post: Comment; meta: CommentMeta }) {
  const labels = postLabels(post, meta);
  return (
    <ul className={`${tools.buttons} ${labels.length > 0 ? tools.buttonsLabel : ''}`}>
      {labels}
      <li className={`${tools.button} ${labels.length === 0 ? tools.firstButton : ''}`}>
        <Link href={postPath(post.cid)}>{commentCount(post.reply_count)}</Link>
      </li>
      <li className={tools.button}>
        <a href={seeditPostUrl(post.community_address, post.cid)} target="_blank" rel="noopener noreferrer">
          view on seedit
        </a>
      </li>
    </ul>
  );
}

function VoteColumn({ post }: { post: Comment }) {
  return (
    <div className={styles.midcol}>
      <div className={styles.arrowWrapper}>
        <div className={`${styles.arrowCommon} ${styles.arrowUp} ${ax.inert}`} aria-hidden />
      </div>
      <div className={styles.score} title="score">
        {formatScore(getPostScore(post.upvote_count, post.downvote_count))}
      </div>
      <div className={styles.arrowWrapper}>
        <div className={`${styles.arrowCommon} ${styles.arrowDown} ${ax.inert}`} aria-hidden />
      </div>
    </div>
  );
}

interface PostRowProps {
  post: Comment;
  /** Feed rank; omitted on the post page. */
  rank?: number;
  /** "to s/community" in the tagline (not on the community's own page). */
  showCommunity?: boolean;
  /** The post page: the title is the page's h1 and the post starts expanded. */
  isPostPage?: boolean;
}

/**
 * Server port of Seedit's feed row (src/components/post/post.tsx): rank,
 * inert vote column, thumbnail, title + domain, expand button, tagline and the
 * buttons that make sense read-only. The expand toggle is a checkbox, so a
 * post opens without JavaScript.
 */
export function PostRow({ post, rank, showCommunity = true, isPostPage = false }: PostRowProps) {
  const view = getPostView(post, isPostPage);
  const toggleId = `x-${post.cid}`;
  return (
    <div className={`${styles.content} post-row`}>
      <div>
        <div className={`${styles.container} ${styles.visible} ${ax.relative}`}>
          <div className={`${styles.row} ${ax.postRow}`}>
            {rank !== undefined ? <div className={`${styles.rank} ${ax.rank}`}>{view.meta.pinned ? undefined : rank}</div> : null}
            <div className={styles.leftcol}>
              <VoteColumn post={post} />
              <Thumbnail
                media={view.media}
                href={postPath(post.cid)}
                isLink={!view.hasThumbnail && Boolean(view.link)}
                isText={!view.hasThumbnail && !view.link}
                isNsfw={view.meta.nsfw}
                isSpoiler={view.meta.spoiler}
                linkWidth={view.meta.linkWidth}
                linkHeight={view.meta.linkHeight}
              />
            </div>
            <div className={`${styles.entry} ${ax.entry}`}>
              {view.canExpand ? (
                <input
                  type="checkbox"
                  id={toggleId}
                  className={`${ax.toggle} ${ax.expandToggle}`}
                  defaultChecked={isPostPage}
                  aria-controls={`${toggleId}-content`}
                />
              ) : null}
              <div className={`${styles.topMatter} ${ax.topMatter}`}>
                <TitleLine view={view} isPostPage={isPostPage} />
                {view.canExpand ? (
                  <label htmlFor={toggleId} className={`${expandButton.buttonWrapper} ${ax.expandLabel}`}>
                    <span className={`expando-button ${expandButton.buttonCommon} ${expandButton[view.buttonType]} ${ax.expandIcon}`} aria-hidden />
                    <span className={ax.srOnly}>show post content</span>
                  </label>
                ) : null}
                <Tagline post={post} meta={view.meta} showCommunity={showCommunity} />
                <PostButtons post={post} meta={view.meta} />
              </div>
              {view.hasExpando ? <PostExpando view={view} id={`${toggleId}-content`} /> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
