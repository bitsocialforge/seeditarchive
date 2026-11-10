import type { Comment } from './types';

/**
 * Why the API redacted this comment, if it did. The indexer sets each flag on
 * its own, so every label ranks them the same way: an operator takedown over a
 * moderator removal over the author's own deletion.
 */
function tombstoneKind(c: Comment): 'takedown' | 'removed' | 'deleted' | null {
  if (c.takedown) return 'takedown';
  if (c.removed) return 'removed';
  return c.deleted ? 'deleted' : null;
}

/** True when the API redacted this comment into a tombstone. */
export function isTombstone(c: Comment): boolean {
  return tombstoneKind(c) !== null;
}

/** An author deletion, as opposed to a moderator removal or an operator takedown. */
export const isAuthorDeletion = (c: Comment) => tombstoneKind(c) === 'deleted';

/** Seedit's "[removed]" / "[deleted]" placeholder for a redacted title or author. */
export const tombstoneTitle = (c: Comment) => (isAuthorDeletion(c) ? '[deleted]' : '[removed]');

/** Seedit's locked/removed/deleted infobar state for a thread's original post. */
export function lockedInfobar(op: Comment, locked: boolean): '' | 'deleted' | 'locked' | 'removed' {
  const kind = tombstoneKind(op);
  if (kind === 'deleted') return 'deleted';
  if (locked) return 'locked';
  return kind ? 'removed' : '';
}

/** The note shown under a tombstone: never takedown_reason, which is operator bookkeeping. */
export function tombstoneNote(c: Comment): string | null {
  if (c.takedown) return 'removed by takedown request';
  return c.mod_reason ? `mod reason: ${c.mod_reason}` : null;
}
