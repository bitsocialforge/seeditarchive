import type { Comment } from './types';

export interface Flair {
  text: string;
  backgroundColor?: string;
  textColor?: string;
}

/** Display metadata Seedit reads from a comment that the flattened API row has no column for. */
export interface CommentMeta {
  linkWidth?: number;
  linkHeight?: number;
  spoiler: boolean;
  nsfw: boolean;
  pinned: boolean;
  locked: boolean;
  flair?: Flair;
}

const EMPTY: CommentMeta = { spoiler: false, nsfw: false, pinned: false, locked: false };

type Json = Record<string, unknown>;

const asRecord = (value: unknown): Json | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : undefined;

const positiveNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined);

// Flair colors land in an inline style, so only plain color syntax is accepted.
const COLOR = /^(#[0-9a-f]{3,8}|[a-z]{3,20}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\))$/i;
const color = (value: unknown) => (typeof value === 'string' && COLOR.test(value.trim()) ? value.trim() : undefined);

function flairOf(value: unknown): Flair | undefined {
  const flair = asRecord(value);
  if (!flair || typeof flair.text !== 'string' || !flair.text.trim()) return undefined;
  const expiresAt = positiveNumber(flair.expiresAt);
  if (expiresAt && Date.now() / 1000 > expiresAt) return undefined;
  return { text: flair.text.slice(0, 64), backgroundColor: color(flair.backgroundColor), textColor: color(flair.textColor) };
}

/**
 * Read a row's own metadata from its `raw` JSON. Only these scalar fields of
 * `raw.comment` / `raw.commentUpdate` are used: content always comes from the
 * row itself, and `commentUpdate.replies` (preloaded reply pages, which the
 * API does not redact) is never touched. Tombstones have no raw and get the
 * defaults.
 */
export function getCommentMeta(row: Pick<Comment, 'raw' | 'nsfw'>): CommentMeta {
  if (!row.raw) return { ...EMPTY, nsfw: row.nsfw === 1 };
  let parsed: Json | undefined;
  try {
    parsed = asRecord(JSON.parse(row.raw));
  } catch {
    parsed = undefined;
  }
  const comment = asRecord(parsed?.comment) ?? {};
  const update = asRecord(parsed?.commentUpdate) ?? {};
  const edit = asRecord(update.edit) ?? {};
  return {
    linkWidth: positiveNumber(comment.linkWidth),
    linkHeight: positiveNumber(comment.linkHeight),
    spoiler: comment.spoiler === true || edit.spoiler === true || update.spoiler === true,
    nsfw: row.nsfw === 1 || comment.nsfw === true || edit.nsfw === true || update.nsfw === true,
    pinned: update.pinned === true,
    locked: update.locked === true,
    flair: flairOf(update.flair) ?? flairOf(edit.flair) ?? flairOf(comment.flair),
  };
}
