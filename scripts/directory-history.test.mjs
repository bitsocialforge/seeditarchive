// node --test scripts/directory-history.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeDirectories } from './directory-history.mjs';

const news = (boards, former) => ({ code: 'news', title: 'News', boards, ...(former ? { former } : {}) });
const pics = { code: 'pics', title: 'Pics', boards: ['pics-posting.bso'] };

test('a community dropped from the list stays under its code', () => {
  assert.deepEqual(mergeDirectories([news(['a.bso', 'b.bso'])], [news(['a.bso'])]), [news(['a.bso'], ['b.bso'])]);
});

test('former communities accumulate, oldest departure first', () => {
  assert.deepEqual(mergeDirectories([news(['c.bso'], ['a.bso'])], [news(['d.bso'])]), [news(['d.bso'], ['a.bso', 'c.bso'])]);
});

test('a returning community moves back to the current list', () => {
  assert.deepEqual(mergeDirectories([news(['b.bso'], ['a.bso'])], [news(['a.bso', 'b.bso'])]), [news(['a.bso', 'b.bso'])]);
});

test('current entries keep their order; a code that leaves the lists goes last', () => {
  const previous = [news(['a.bso']), pics];
  assert.deepEqual(mergeDirectories(previous, [pics]), [pics, news([], ['a.bso'])]);
});

test('current metadata wins over the previous entry', () => {
  const previous = [{ ...news(['a.bso']), description: 'old' }];
  const current = [{ ...news(['a.bso']), description: 'new' }];
  assert.deepEqual(mergeDirectories(previous, current), current);
});

test('an unchanged map is written back unchanged', () => {
  const map = [news(['a.bso', 'b.bso']), pics];
  assert.deepEqual(mergeDirectories(map, map), map);
});
