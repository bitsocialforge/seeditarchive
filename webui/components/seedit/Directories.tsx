import Link from 'next/link';
import { archivedBoards, codePath, type Directory, DIRECTORY_INDEX_PATH, directoryListPath } from '@/lib/directories';
import { communityPath } from '@/lib/paths';
import { formattedDate, getDisplayAddress, getShortDisplayAddress, pluralize, timeAgo, utcTimestamp } from '@/lib/seedit';
import type { Community } from '@/lib/types';
import ax from '@/styles/archive.module.css';
import labelStyles from '@/styles/seedit/components/label.module.css';
import styles from '@/styles/seedit/views/communities.module.css';
import dir from '@/styles/seedit/views/directory-vote.module.css';

/**
 * Seedit's directory views (src/views/communities/directory-vote.tsx and
 * community-item.tsx), read-only: the index of short routes and one route's
 * ranked candidates. Votes, scores and subscribe buttons are Seedit's; the
 * archive shows what it holds for each community instead.
 */

const Tags = ({ tags }: { tags?: string[] }) =>
  tags?.length ? (
    <div className={dir.directoryTags}>
      {tags.map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
  ) : null;

const Separator = () => (
  <span className={dir.directoryFactSeparator} aria-hidden="true">
    ·
  </span>
);

/** One row of Seedit's DirectoryIndex. */
function DirectoryIndexRow({ directory, communities }: { directory: Directory; communities: Map<string, Community> }) {
  const winner = directory.boards[0];
  const all = archivedBoards(directory);
  const posts = all.reduce((sum, address) => sum + (communities.get(address)?.post_count ?? 0), 0);
  return (
    <li className={dir.directoryRow}>
      <div className={dir.directoryMidcol} />
      <div className={dir.directoryEntry}>
        <div className={dir.directoryTitle}>
          <Link href={directoryListPath(directory.code)}>
            s/{directory.code}
            <span className={dir.directoryName}>: {directory.title}</span>
          </Link>
        </div>
        {directory.description ? <p className={dir.directoryDescription}>{directory.description}</p> : null}
        <Tags tags={directory.tags} />
        <div className={dir.directoryTagline}>
          {winner ? (
            <span className={dir.directoryWinner}>
              <span className={dir.directoryWinnerLabel}>current winner:</span>{' '}
              <Link href={communityPath(winner)}>{getDisplayAddress(winner)}</Link>
              <Separator />
            </span>
          ) : null}
          <span>
            {all.length} {pluralize(all.length, 'community', 'communities')}
          </span>
          <Separator />
          <Link href={codePath(directory.code)}>
            {posts} {pluralize(posts, 'post', 'posts')} archived
          </Link>
        </div>
      </div>
    </li>
  );
}

export function DirectoryIndex({ directories, communities }: { directories: Directory[]; communities: Map<string, Community> }) {
  return (
    <>
      <div className={dir.directoryHeading}>
        <span className={dir.directoryHeadingTitle}>directories</span>
        <p className={dir.directoryHeadingDescription}>
          Seedit&apos;s short routes. Communities compete for each one, and Seedit opens the route on the top-ranked candidate. The
          archive keeps posts from every candidate, past and present.
        </p>
      </div>
      <ul className={dir.directoryIndex} role="list">
        {directories.map((directory) => (
          <DirectoryIndexRow key={directory.code} directory={directory} communities={communities} />
        ))}
      </ul>
    </>
  );
}

/** One candidate, as Seedit's CommunityItem, with archive facts in place of members and votes. */
function Candidate({ address, rank, community, left }: { address: string; rank?: number; community?: Community; left: boolean }) {
  return (
    <div className={styles.community}>
      <div className={styles.row}>
        <div className={`${styles.rank} ${ax.desktopOnly}`}>{rank ?? '–'}</div>
        <div className={styles.entry}>
          <div className={styles.title}>
            <div className={styles.titleWrapper}>
              <Link href={communityPath(address)}>
                s/{getShortDisplayAddress(address)}
                {community?.title ? `: ${community.title}` : ''}
              </Link>
              {rank === 1 ? (
                <span className={`${labelStyles.label} ${ax.inlineLabel}`} title="The top-ranked candidate: Seedit opens the route on it">
                  <span className={`${labelStyles.stamp} ${labelStyles.green}`}>winner</span>
                </span>
              ) : null}
              {left ? (
                <span className={`${labelStyles.label} ${ax.inlineLabel}`} title="No longer in the route's list; its posts stay archived here">
                  <span className={`${labelStyles.stamp} ${labelStyles.black}`}>left</span>
                </span>
              ) : null}
            </div>
          </div>
          <div className={styles.tagline}>
            {community ? (
              <>
                {community.post_count} {pluralize(community.post_count, 'post', 'posts')} archived,{' '}
                <span title={utcTimestamp(community.added_at)}>archived since {formattedDate(community.added_at)}</span>
                {community.last_indexed_at ? `, last indexed ${timeAgo(community.last_indexed_at)}` : ''}
              </>
            ) : (
              'not archived yet'
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DirectoryCandidates({ directory, communities }: { directory: Directory; communities: Map<string, Community> }) {
  return (
    <>
      <div className={dir.directoryHeading}>
        <Link className={dir.directoryBackLink} href={DIRECTORY_INDEX_PATH}>
          ← back to all directories
        </Link>
        <div>
          <span className={dir.directoryHeadingTitle}>
            <Link href={codePath(directory.code)}>s/{directory.code}</Link>: {directory.title}
          </span>
        </div>
        {directory.description ? <p className={dir.directoryHeadingDescription}>{directory.description}</p> : null}
        <Tags tags={directory.tags} />
      </div>
      {directory.boards.map((address, index) => (
        <Candidate key={address} address={address} rank={index + 1} community={communities.get(address)} left={false} />
      ))}
      {directory.former.map((address) => (
        <Candidate key={address} address={address} community={communities.get(address)} left />
      ))}
    </>
  );
}
