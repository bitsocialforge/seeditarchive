import type { Comment } from './types';

/** True when the API redacted this comment into a tombstone. */
export function isTombstone(c: Comment): boolean {
  return Boolean(c.removed || c.deleted || c.takedown);
}

/** An author deletion, as opposed to a moderator removal or an operator takedown. */
export const isAuthorDeletion = (c: Comment) => Boolean(c.deleted && !c.removed && !c.takedown);

/** Seedit's "[removed]" / "[deleted]" placeholder for a redacted title or author. */
export const tombstoneTitle = (c: Comment) => (isAuthorDeletion(c) ? '[deleted]' : '[removed]');

/** The note shown under a tombstone: never takedown_reason, which is operator bookkeeping. */
export function tombstoneNote(c: Comment): string | null {
  if (c.takedown) return 'removed by takedown request';
  return c.mod_reason ? `mod reason: ${c.mod_reason}` : null;
}
