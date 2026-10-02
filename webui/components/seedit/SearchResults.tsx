import Link from 'next/link';
import { getCommentMeta } from '@/lib/comment-meta';
import { getHighlightSegments, getHighlightTerms } from '@/lib/highlight';
import { SEARCH_SORTS, type SearchSort, type SearchState, searchHref, TIME_FILTERS, TIME_LABELS } from '@/lib/listing';
import { getHasThumbnail, getMediaInfo } from '@/lib/media';
import { communityPath, postPath } from '@/lib/paths';
import { getShortAddress, getShortDisplayAddress, safeHttpUrl, UGC_REL } from '@/lib/seedit';
import { isTombstone, tombstoneTitle } from '@/lib/tombstone';
import type { Comment } from '@/lib/types';
import ax from '@/styles/archive.module.css';
import searchBar from '@/styles/seedit/components/search-bar.module.css';
import styles from '@/styles/seedit/components/search-result.module.css';
import { EmptyFeedMessage } from './Feed';
import { Flair } from './Labels';
import { TimeAgo } from './PostRow';
import { Thumbnail } from './Thumbnail';

/** Seedit's HighlightedText: matches are <mark> elements, rendered as React text (never markup). */
function HighlightedText({ text, terms }: { text: string; terms: string[] }) {
  return getHighlightSegments(text, terms).map((segment, index) =>
    segment.match ? <mark key={index}>{segment.text}</mark> : <span key={index}>{segment.text}</span>,
  );
}

/** Seedit's search pane (search-bar.tsx, variant "page") as a native GET form. */
export function SearchPane({ state }: { state: SearchState }) {
  return (
    <div className={searchBar.searchPane}>
      <h2 className={searchBar.searchPaneTitle}>search</h2>
      <form className={searchBar.pageSearchForm} action="/search" method="get" role="search">
        <div className={searchBar.pageSearchRow}>
          <input
            type="text"
            name="q"
            placeholder="search"
            aria-label="Search the archive"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            defaultValue={state.query}
          />
          {state.sort !== 'relevance' ? <input type="hidden" name="sort" value={state.sort} /> : null}
          {state.time !== 'all' ? <input type="hidden" name="t" value={state.time} /> : null}
          <button aria-label="search" className={searchBar.pageSearchSubmit} type="submit">
            <span className={searchBar.pageSearchIcon} />
          </button>
        </div>
      </form>
    </div>
  );
}

const SORT_LABELS: Record<SearchSort, string> = { relevance: 'relevance', top: 'top', new: 'new', comments: 'comments' };

function SearchMenu({ title, selected, choices }: { title: string; selected: string; choices: { key: string; label: string; href: string }[] }) {
  return (
    <div>
      {title}:{' '}
      <details className={styles.dropdown}>
        <summary className={styles.selected}>{selected}</summary>
        <div className={styles.dropChoices}>
          {choices.map((choice) => (
            <Link key={choice.key} href={choice.href}>
              {choice.label}
            </Link>
          ))}
        </div>
      </details>
    </div>
  );
}

/** Seedit's "sorted by" / "links from" menus (search-result-menus.tsx); every choice is a URL. */
function SearchResultMenus({ state }: { state: SearchState }) {
  return (
    <>
      <SearchMenu
        title="sorted by"
        selected={SORT_LABELS[state.sort]}
        choices={SEARCH_SORTS.filter((sort) => sort !== state.sort).map((sort) => ({
          key: sort,
          label: SORT_LABELS[sort],
          href: searchHref({ ...state, sort, page: 1 }),
        }))}
      />
      <SearchMenu
        title="links from"
        selected={TIME_LABELS[state.time]}
        choices={TIME_FILTERS.filter((time) => time !== state.time).map((time) => ({
          key: time,
          label: TIME_LABELS[time],
          href: searchHref({ ...state, time, page: 1 }),
        }))}
      />
    </>
  );
}

/** A post body clipped to three faded lines with a more/less toggle (a checkbox here; Seedit measures in JS). */
function SearchResultExcerpt({ id, content, terms }: { id: string; content: string; terms: string[] }) {
  const clipped = content.length > 180 || content.split('\n').length > 3;
  if (!clipped) {
    return (
      <div className={styles.expando}>
        <div className={styles.body}>
          <HighlightedText text={content} terms={terms} />
        </div>
      </div>
    );
  }
  return (
    <>
      <input type="checkbox" id={id} className={`${ax.toggle} ${ax.excerptToggle}`} aria-label="show the whole excerpt" />
      <div className={`${styles.expando} ${styles.collapsedExpando} ${ax.excerpt}`}>
        <div className={styles.body}>
          <HighlightedText text={content} terms={terms} />
        </div>
      </div>
      <label htmlFor={id} className={`${styles.expandoButton} ${ax.excerptButton}`}>
        <span className={ax.whenChecked}>less</span>
        <span className={ax.whenUnchecked}>more</span>
      </label>
    </>
  );
}

/** The meta line: score, comments, age, author and community. */
function SearchResultMeta({ comment, nsfw, path }: { comment: Comment; nsfw: boolean; path: string }) {
  const score = (comment.upvote_count ?? 0) - (comment.downvote_count ?? 0);
  const authorName = isTombstone(comment) ? '' : comment.author_name?.trim() || getShortAddress(comment.author_address);
  return (
    <div className={styles.meta}>
      {nsfw ? (
        <>
          <span className={`${styles.stamp} ${styles.nsfwStamp}`}>nsfw</span>{' '}
        </>
      ) : null}
      <span className={`${styles.icon} ${styles.scoreIcon}`} aria-hidden />
      <span className={styles.score}>
        {score.toLocaleString('en')} {score === 1 ? 'point' : 'points'}
      </span>{' '}
      {comment.parent_cid ? null : (
        <>
          <Link className={styles.comments} href={path}>
            {(comment.reply_count ?? 0).toLocaleString('en')} {comment.reply_count === 1 ? 'comment' : 'comments'}
          </Link>{' '}
        </>
      )}
      <span>
        submitted <TimeAgo timestamp={comment.timestamp} />
      </span>{' '}
      {authorName ? <span>by {authorName}</span> : null}{' '}
      <span>
        to <Link href={communityPath(comment.community_address)}>s/{getShortDisplayAddress(comment.community_address)}</Link>
      </span>
    </div>
  );
}

function getResultView(comment: Comment) {
  const tombstone = isTombstone(comment);
  const link = tombstone ? undefined : safeHttpUrl(comment.link);
  const media = tombstone ? undefined : getMediaInfo(comment.link, comment.thumbnail_url);
  const hasMedia = getHasThumbnail(media);
  const content = tombstone ? null : comment.content;
  const communityLabel = `s/${getShortDisplayAddress(comment.community_address)}`;
  return {
    meta: getCommentMeta(comment),
    link,
    media,
    hasMedia,
    // A post's excerpt sits under its title; a reply has no title, so its text is the heading.
    excerpt: comment.title && content ? content : null,
    heading: tombstone ? tombstoneTitle(comment) : comment.title || content || communityLabel,
    // A post always gets the thumbnail column; a matched reply only when it links media.
    showsThumbnail: !comment.parent_cid || hasMedia,
  };
}

/** Seedit's SearchResultPost (search-result-post.tsx): one matched post or reply. */
export function SearchResultPost({ comment, terms }: { comment: Comment; terms: string[] }) {
  const { meta, link, media, hasMedia, excerpt, heading, showsThumbnail } = getResultView(comment);
  // A reply links to its permalink, which shows it under its post.
  const path = postPath(comment.cid);

  return (
    <div className={`${styles.result} ${showsThumbnail ? styles.hasThumbnail : ''}`}>
      {showsThumbnail ? (
        <div className={styles.thumbnail}>
          <Thumbnail
            media={media}
            href={path}
            isLink={!hasMedia && Boolean(link)}
            isText={!hasMedia && !link}
            isNsfw={meta.nsfw}
            isSpoiler={meta.spoiler}
            linkWidth={meta.linkWidth}
            linkHeight={meta.linkHeight}
          />
        </div>
      ) : null}
      <div>
        <header className={styles.resultHeader}>
          <Link className={`${styles.title} post-title`} href={path}>
            <HighlightedText text={heading} terms={terms} />
          </Link>
          {meta.flair ? <Flair flair={meta.flair} /> : null}
        </header>
        <SearchResultMeta comment={comment} nsfw={meta.nsfw} path={path} />
        {excerpt ? <SearchResultExcerpt id={`m-${comment.cid}`} content={excerpt} terms={terms} /> : null}
        {link ? (
          <div className={styles.footer}>
            <span className={`${styles.icon} ${styles.externalLinkIcon}`} aria-hidden />
            <a className={styles.footerLink} href={link} rel={UGC_REL} target="_blank">
              {link}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface SearchResultGroupProps {
  state: SearchState;
  posts: Comment[];
  total: number;
  pageSize: number;
}

/** Seedit's posts group (search-result-group.tsx) with prev/next links in place of "Load more". */
export function SearchResultGroup({ state, posts, total, pageSize }: SearchResultGroupProps) {
  const terms = getHighlightTerms(state.query);
  const hasNext = (state.page - 1) * pageSize + posts.length < total && posts.length > 0;
  const hasPrev = state.page > 1;
  return (
    <div className={styles.group}>
      <header className={styles.groupHeader}>
        <h2 className={`${styles.groupHeaderLabel} ${ax.groupHeading}`}>posts</h2>
        <div className={styles.groupHeaderMenus}>
          <SearchResultMenus state={state} />
        </div>
      </header>
      <div className={styles.contents}>
        {posts.map((comment) => (
          <SearchResultPost key={comment.cid} comment={comment} terms={terms} />
        ))}
      </div>
      <footer>
        {posts.length === 0 ? <EmptyFeedMessage /> : null}
        {hasPrev || hasNext ? (
          <nav className={`${styles.loadMoreRow} ${ax.pagination}`} aria-label="pagination">
            view more:{' '}
            {hasPrev ? (
              <Link className={styles.loadMore} href={searchHref({ ...state, page: state.page - 1 })} rel="prev">
                ‹ prev
              </Link>
            ) : null}
            {hasPrev && hasNext ? <span className={ax.paginationSeparator} aria-hidden /> : null}
            {hasNext ? (
              <Link className={styles.loadMore} href={searchHref({ ...state, page: state.page + 1 })} rel="next">
                next ›
              </Link>
            ) : null}
          </nav>
        ) : null}
      </footer>
    </div>
  );
}
