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
 *   node scripts/build-communities.mjs
 *
 * Set GITHUB_TOKEN to raise the GitHub API rate limit. Directory files are
 * downloaded from their API-provided raw URLs.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'bitsocialnet/lists';
const DIRECTORY_PATH = 'seedit-directories';
const DEFAULTS_PATH = 'seedit-default-subscriptions.json';
const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, '..', 'config', 'communities.json');

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
  (file) => /^seedit-.+-directory\.json$/.test(file.name) && file.name !== 'seedit-directories-defaults.json',
);

const addresses = new Set();
addCommunityAddresses(addresses, defaults.communities, DEFAULTS_PATH);

const directories = await Promise.all(files.map(async (file) => [file.name, await fetchJson(file.download_url)]));
for (const [name, directory] of directories) {
  addCommunityAddresses(addresses, directory.communities, `${DIRECTORY_PATH}/${name}`);
}

const list = [...addresses].sort();
if (list.length === 0) throw new Error('Refusing to write an empty Seedit community list');

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(list, null, 2)}\n`);
console.log(
  `Wrote ${list.length} Seedit communities (${defaults.communities.length} defaults, ${files.length} directories) to config/communities.json`,
);
