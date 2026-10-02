/**
 * Merge a freshly built directory map into the previous one without ever
 * dropping a community.
 *
 * Seedit's short routes (/s/news, /s/pics…) are contested: communities join a
 * code's list, fall out of it, and the winner changes. The archive's code page
 * (/s/news) lists posts from every community that has ever competed for the
 * code, so the map only grows:
 *
 *   boards   the code's current candidates, in Seedit's rank order (from the lists)
 *   former   communities listed under the code before and not any more, oldest
 *            departures first; omitted when empty
 *
 * A code that disappears from the lists keeps its entry (after the current
 * ones), with every community it ever had under `former`. A former community
 * that comes back moves back into `boards`. Current entries keep their order.
 *
 * @template {{ code: string, boards: string[], former?: string[] }} T
 * @param {T[]} previous
 * @param {T[]} current
 * @returns {T[]}
 */
export function mergeDirectories(previous, current) {
  const merged = new Map();

  for (const dir of current) {
    const { former: _ignored, ...rest } = dir;
    merged.set(dir.code, { ...rest, boards: [...dir.boards] });
  }

  for (const old of previous) {
    const { former: _old, ...rest } = old;
    const entry = merged.get(old.code) ?? { ...rest, boards: [] };
    const listed = new Set(entry.boards);
    const former = [...new Set([...(old.former ?? []), ...old.boards])].filter((address) => !listed.has(address));
    if (former.length > 0) entry.former = former;
    merged.set(old.code, entry);
  }

  return [...merged.values()];
}
