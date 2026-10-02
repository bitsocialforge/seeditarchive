#!/usr/bin/env node
/**
 * Build Seedit Archive's crawl scope from the official bitsocialnet/lists
 * discovery sources.
 *
 * The output is the union of:
 *   - every exact address in seedit-default-subscriptions.json; and
 *   - every candidate address in seedit-directories/seedit-*-directory.json.
 *
 * This intentionally excludes 5chan directories and arbitrary communities
 * known only to the shared Bitsocial daemon.
 *
 * It also writes webui/lib/directories.json: Seedit's short routes (/s/news…)
 * with their candidates in Seedit's rank order, plus display metadata from
 * seedit-directories-defaults.json. That map only grows (directory-history.mjs):
 * a community that leaves a code's list stays under the code as `former`, so
 * the archive's /s/<code> page keeps listing its posts. The crawl set above
 * follows the current lists only.
 *
 *   node scripts/build-communities.mjs
 *
 * Set GITHUB_TOKEN to raise the GitHub API rate limit. Directory files are
 * downloaded from their API-provided raw URLs.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeDirectories } from './directory-history.mjs';

const REPO = 'bitsocialnet/lists';
const DIRECTORY_PATH = 'seedit-directories';
const DEFAULTS_PATH = 'seedit-default-subscriptions.json';
const DIRECTORY_DEFAULTS_FILE = 'seedit-directories-defaults.json';
const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, '..', 'config', 'communities.json');
const directoriesPath = join(here, '..', 'webui', 'lib', 'directories.json');

const auth = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
const headers = {
  'User-Agent': 'seeditarchive-build',
  Accept: 'application/vnd.github+json',
  ...auth,
};

async function fetchJson(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  return response.json();
}

function addCommunityAddresses(addresses, communities, source) {
  if (!Array.isArray(communities)) throw new Error(`${source} has no communities array`);
  for (const community of communities) {
    const address = typeof community?.address === 'string' ? community.address.trim() : '';
    if (!address) throw new Error(`${source} contains a community without an address`);
    addresses.add(address);
  }
}

const [defaults, listing] = await Promise.all([
  fetchJson(`https://api.github.com/repos/${REPO}/contents/${DEFAULTS_PATH}`)
    .then((metadata) => fetchJson(metadata.download_url)),
  fetchJson(`https://api.github.com/repos/${REPO}/contents/${DIRECTORY_PATH}`),
]);

if (!Array.isArray(listing)) {
  throw new Error(`Unexpected directory listing: ${JSON.stringify(listing).slice(0, 200)}`);
}

const files = listing.filter(
  (file) => /^seedit-.+-directory\.json$/.test(file.name) && file.name !== DIRECTORY_DEFAULTS_FILE,
);
const directoryDefaultsFile = listing.find((file) => file.name === DIRECTORY_DEFAULTS_FILE);
const directoryDefaults = directoryDefaultsFile ? ((await fetchJson(directoryDefaultsFile.download_url)).directories ?? {}) : {};

const addresses = new Set();
addCommunityAddresses(addresses, defaults.communities, DEFAULTS_PATH);

const directories = await Promise.all(files.map(async (file) => [file.name, await fetchJson(file.download_url)]));
for (const [name, directory] of directories) {
  addCommunityAddresses(addresses, directory.communities, `${DIRECTORY_PATH}/${name}`);
}

/** Seedit's sortDirectoryCommunitiesByRank: score, then oldest candidate, then address. */
const rank = (communities) =>
  [...communities].sort(
    (a, b) =>
      (b.score ?? 0) - (a.score ?? 0) ||
      (a.addedAt ?? Number.MAX_SAFE_INTEGER) - (b.addedAt ?? Number.MAX_SAFE_INTEGER) ||
      (a.address < b.address ? -1 : a.address > b.address ? 1 : 0),
  );

// Seedit's own order for the codes: the order of the default subscriptions.
const codeOrder = (defaults.communities ?? []).map((community) => community.directoryCode).filter(Boolean);
const position = (code) => (codeOrder.includes(code) ? codeOrder.indexOf(code) : codeOrder.length);
const currentDirectories = directories
  .map(([name, directory]) => {
    const code = directory.directoryCode ?? name.replace(/^seedit-/, '').replace(/-directory\.json$/, '');
    const meta = directoryDefaults[code] ?? {};
    return {
      code,
      title: meta.title ?? code,
      ...(meta.description ? { description: meta.description } : {}),
      ...(directory.tags?.length ? { tags: directory.tags } : {}),
      boards: rank(directory.communities).map((community) => community.address.trim()),
    };
  })
  .sort((a, b) => position(a.code) - position(b.code) || a.code.localeCompare(b.code));

const previousDirectories = JSON.parse(await readFile(directoriesPath, 'utf8').catch(() => '[]'));
const mergedDirectories = mergeDirectories(previousDirectories, currentDirectories);

const list = [...addresses].sort();
if (list.length === 0) throw new Error('Refusing to write an empty Seedit community list');

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(list, null, 2)}\n`);
await writeFile(directoriesPath, `${JSON.stringify(mergedDirectories, null, 2)}\n`);
console.log(
  `Wrote ${list.length} Seedit communities (${defaults.communities.length} defaults, ${files.length} directories) to config/communities.json`,
);
console.log(
  `Wrote ${mergedDirectories.length} directories to webui/lib/directories.json ` +
    `(${mergedDirectories.reduce((sum, d) => sum + (d.former?.length ?? 0), 0)} former communities kept)`,
);
