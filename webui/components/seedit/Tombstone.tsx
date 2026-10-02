import { isAuthorDeletion, tombstoneNote, tombstoneTitle } from '@/lib/tombstone';
import type { Comment } from '@/lib/types';
import expando from '@/styles/seedit/components/expando.module.css';
import reply from '@/styles/seedit/components/reply.module.css';

/**
 * Body of a removed/deleted/taken-down comment. The API serves tombstones with
 * all content fields nulled, so only the fact (and the optional moderator
 * reason) is shown, the way Seedit marks a removed or deleted reply. Operator
 * takedowns show the marker and the takedown note alone: takedown_reason is
 * operator bookkeeping, not public copy.
 */
export function TombstoneNote({ comment, variant = 'post' }: { comment: Comment; variant?: 'post' | 'reply' }) {
  const marker = tombstoneTitle(comment);
  const note = tombstoneNote(comment);
  if (variant === 'reply') {
    return (
      <>
        <span className={isAuthorDeletion(comment) ? reply.deletedContent : reply.removedContent}>{marker}</span>
        {note ? <p className={reply.modReason}>{note}</p> : null}
      </>
    );
  }
  return (
    <>
      <p>{marker}</p>
      {note ? <p className={expando.modReason}>{note}</p> : null}
    </>
  );
}
