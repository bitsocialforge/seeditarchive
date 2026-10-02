/** Seedit's search-highlight-utils: query terms and the matched/unmatched runs of a text. */

export interface HighlightSegment {
  match: boolean;
  text: string;
}

/** The distinct words of a query, longest first so a longer term wins an overlap. */
export const getHighlightTerms = (query: string): string[] =>
  [...new Set(query.toLowerCase().split(/\s+/).filter(Boolean))].sort((a, b) => b.length - a.length);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Returned as data rather than markup: segments are rendered as React text, so indexed text can't inject HTML. */
export function getHighlightSegments(text: string, terms: string[]): HighlightSegment[] {
  if (!text) return [];
  if (terms.length === 0) return [{ match: false, text }];
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  const segments: HighlightSegment[] = [];
  let lastIndex = 0;
  for (const found of text.matchAll(pattern)) {
    const start = found.index ?? 0;
    if (start > lastIndex) segments.push({ match: false, text: text.slice(lastIndex, start) });
    segments.push({ match: true, text: found[0] });
    lastIndex = start + found[0].length;
  }
  if (lastIndex < text.length) segments.push({ match: false, text: text.slice(lastIndex) });
  return segments;
}
