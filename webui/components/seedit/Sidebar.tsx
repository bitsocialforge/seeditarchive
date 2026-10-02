import Link from 'next/link';
import type { ReactNode } from 'react';
import { archivedBoards, codePath, type Directory, directoryForAddress, directoryListPath } from '@/lib/directories';
import { communityPath, postPath } from '@/lib/paths';
import { formattedDate, getDisplayAddress, getPostScore, getShortDisplayAddress, timeAgo, utcTimestamp } from '@/lib/seedit';
import { siteName, siteUrl } from '@/lib/site';
import type { Comment, Community, Health } from '@/lib/types';
import ax from '@/styles/archive.module.css';
import searchBar from '@/styles/seedit/components/search-bar.module.css';
import styles from '@/styles/seedit/components/sidebar.module.css';
import { Markdown } from './Markdown';

/** Seedit's sidebar column (src/components/sidebar/sidebar.tsx), floated right at 300px. */
export function Sidebar({ children }: { children: ReactNode }) {
  return <div className={styles.sidebar}>{children}</div>;
}

/**
 * Seedit's compact SearchBar as a native GET form. Seedit's focus-only
 * options box is left out, along with the -47px offset that compensates for it.
 */
export function SidebarSearch({ defaultValue = '' }: { defaultValue?: string }) {
  return (
    <div className={`${styles.searchBarWrapper} ${ax.sidebarSearch} header-search`}>
      <div className={searchBar.searchBarWrapper}>
        <form className={searchBar.searchBar} action="/search" method="get" role="search">
          <input
            type="text"
            name="q"
            placeholder="search"
            aria-label="Search the archive"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            defaultValue={defaultValue}
          />
          <input type="submit" value="" aria-label="search" />
        </form>
      </div>
    </div>
  );
}

/** Seedit's large sidebar button (with its nub), as a real link. */
export function LargeButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={ax.blockLink}>
      <div className={styles.largeButton}>
        {children}
        <div className={styles.nub} />
      </div>
    </a>
  );
}

/** Seedit's post-page info box: submit date, points and share link. */
export function PostInfo({ post }: { post: Comment }) {
  const score = getPostScore(post.upvote_count, post.downvote_count);
  const total = post.upvote_count + post.downvote_count;
  const percentage = total > 0 ? Math.round((post.upvote_count / total) * 100) : 0;
  const shareUrl = `${siteUrl}${postPath(post.cid)}`;
  return (
    <div className={styles.postInfo}>
      <div className={styles.postDate}>
        <span title={utcTimestamp(post.timestamp)}>this post was submitted on {formattedDate(post.timestamp)}</span>
      </div>
      <div className={styles.postScore}>
        <span className={styles.postScoreNumber}>{score === '•' ? '0' : score}</span>{' '}
        <span className={styles.postScoreWord}>{score === 1 ? 'point' : 'points'}</span> ({percentage}% upvoted)
      </div>
      <div className={styles.shareLink}>
        share link: <input type="text" value={shareUrl} aria-label="share link" readOnly />
      </div>
    </div>
  );
}

/** Seedit's community title box, with the archive's own facts in place of members/online. */
export function CommunityTitleBox({ community, address }: { community: Community | null; address: string }) {
  const route = directoryForAddress(address);
  return (
    <div className={styles.titleBox}>
      <Link className={styles.title} href={communityPath(address)}>
        {getDisplayAddress(address)}
      </Link>
      {community ? (
        <div className={`${styles.subscribeContainer} ${ax.titleBoxLine}`}>
          {community.post_count} {community.post_count === 1 ? 'post' : 'posts'} archived
        </div>
      ) : null}
      {route ? (
        <div className={ax.titleBoxLine}>
          {route.boards[0] === address ? 'current winner of ' : route.boards.includes(address) ? 'competing for ' : 'formerly competed for '}
          <Link href={codePath(route.code)}>s/{route.code}</Link>
        </div>
      ) : null}
      {community?.description ? (
        <div>
          {community.title ? (
            <div className={styles.descriptionTitle}>
              <strong>{community.title}</strong>
            </div>
          ) : null}
          <div className={styles.description}>
            <Markdown content={community.description} />
          </div>
        </div>
      ) : null}
      {community ? (
        <div className={`${styles.bottom} ${ax.titleBoxBottom}`}>
          <span title={utcTimestamp(community.added_at)}>archived since {formattedDate(community.added_at)}</span>
          {community.last_indexed_at ? <span className={styles.age}>last indexed {timeAgo(community.last_indexed_at)}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

/** The archive's own title box, in place of Seedit's submit/create buttons on the front page. */
export function ArchiveTitleBox({ health }: { health: Health | null }) {
  return (
    <div className={styles.titleBox}>
      <Link className={styles.title} href="/">
        {siteName}
      </Link>
      <div className={styles.description}>
        <p className={ax.paragraph}>
          A permanent, read-only archive of public{' '}
          <a href="https://seedit.app" target="_blank" rel="noopener noreferrer" className={ax.inlineLink}>
            Seedit
          </a>{' '}
          communities. Posts stay searchable here after they leave the live network.
        </p>
      </div>
      {health ? (
        <div className={`${styles.descriptionTitle} ${ax.stats}`}>
          <strong>{health.communities}</strong> {health.communities === 1 ? 'community' : 'communities'} ·{' '}
          <strong>{health.posts}</strong> {health.posts === 1 ? 'post' : 'posts'} · <strong>{health.replies}</strong>{' '}
          {health.replies === 1 ? 'reply' : 'replies'}
        </div>
      ) : null}
      <div className={`${styles.bottom} ${ax.titleBoxBottom}`}>
        <Link href="/legal">about this archive</Link>
        {health?.lastIndexedAt ? (
          <span className={styles.age} title={utcTimestamp(health.lastIndexedAt)}>
            last indexed {timeAgo(health.lastIndexedAt)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Seedit's sidebar list box (as used for moderators), listing archived communities. */
export function CommunityList({ communities, active }: { communities: Community[]; active?: string }) {
  if (communities.length === 0) return null;
  return (
    <div className={styles.list}>
      <div className={styles.listTitle}>communities</div>
      <ul className={`${styles.listContent} ${styles.modsList} community-list`}>
        {communities.map((community) => (
          <li key={community.address} className={ax.communityItem}>
            <Link href={communityPath(community.address)} className={active === community.address ? ax.activeCommunity : undefined}>
              s/{getShortDisplayAddress(community.address)}
            </Link>{' '}
            <span className={ax.count}>({community.post_count})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Seedit's sprout illustration with its two taglines. */
export function SidebarSubtitles() {
  return (
    <div className={styles.communitySubtitles}>
      <span className={styles.createCommunityImage}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/sprout/sprout-2.png" alt="" loading="lazy" />
      </span>
      <div className={styles.createCommunitySubtitle}>...preserved for posterity.</div>
      <div className={styles.createCommunitySubtitle}>...searchable forever.</div>
    </div>
  );
}

/**
 * The title box of a Seedit short route (/s/news): the code, its description,
 * Seedit's current winner (the published list's top candidate) and how much
 * of the code the archive holds.
 */
export function DirectoryTitleBox({ dir, communities }: { dir: Directory; communities: Map<string, Community> }) {
  const winner = dir.boards[0];
  const all = archivedBoards(dir);
  const posts = all.reduce((sum, address) => sum + (communities.get(address)?.post_count ?? 0), 0);
  return (
    <div className={styles.titleBox}>
      <Link className={styles.title} href={codePath(dir.code)}>
        s/{dir.code}
      </Link>
      <div className={`${styles.subscribeContainer} ${ax.titleBoxLine}`}>
        {posts} {posts === 1 ? 'post' : 'posts'} archived from {all.length} {all.length === 1 ? 'community' : 'communities'}
      </div>
      <div>
        <div className={styles.descriptionTitle}>
          <strong>{dir.title}</strong>
        </div>
        {dir.description ? <div className={styles.description}>{dir.description}</div> : null}
      </div>
      <div className={`${styles.bottom} ${ax.titleBoxBottom}`}>
        {winner ? (
          <span>
            current winner: <Link href={communityPath(winner)}>s/{getShortDisplayAddress(winner)}</Link>
          </span>
        ) : (
          <span>no current candidates</span>
        )}
        <Link href={directoryListPath(dir.code)} className={styles.age}>
          {all.length === 1 ? '1 community' : `${all.length} communities`} »
        </Link>
      </div>
    </div>
  );
}
