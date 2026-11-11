import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isAuthorDeletion, isTombstone, lockedInfobar, tombstoneTitle } from '../lib/tombstone.ts';
import type { Comment } from '../lib/types.ts';

const post: Comment = {
  cid: 'post-cid', community_address: 'community.bso', post_cid: 'post-cid', parent_cid: null,
  depth: 0, timestamp: 1_700_000_000, author_address: null, author_name: null,
  title: null, content: null, link: null, thumbnail_url: null,
  reply_count: 0, indexed_at: 1_700_000_001, archived: 1,
  removed: 0, deleted: 0, mod_reason: null, takedown: 0, takedown_reason: null,
  upvote_count: 0, downvote_count: 0,
};

// The indexer sets each flag on its own: a moderator can remove a post its
// author also deleted, and an operator takedown can land on either.
const flag = [0, 1] as const;
const combinations: Comment[] = flag.flatMap((removed) =>
  flag.flatMap((deleted) => flag.map((takedown) => ({ ...post, removed, deleted, takedown }))),
);

test('the thread infobar names the same tombstone as the post title and stamp', () => {
  for (const op of combinations) {
    const flags = `removed=${op.removed} deleted=${op.deleted} takedown=${op.takedown}`;
    if (!isTombstone(op)) {
      assert.equal(lockedInfobar(op, false), '', flags);
      continue;
    }
    const expected = tombstoneTitle(op) === '[deleted]' ? 'deleted' : 'removed';
    assert.equal(isAuthorDeletion(op), expected === 'deleted', flags);
    assert.equal(lockedInfobar(op, false), expected, flags);
  }
});

test('a lock shows on removed posts but never hides an author deletion', () => {
  assert.equal(lockedInfobar(post, true), 'locked');
  assert.equal(lockedInfobar({ ...post, removed: 1 }, true), 'locked');
  assert.equal(lockedInfobar({ ...post, removed: 1, deleted: 1 }, true), 'locked');
  assert.equal(lockedInfobar({ ...post, deleted: 1 }, true), 'deleted');
});
