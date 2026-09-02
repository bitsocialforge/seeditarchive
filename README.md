# Seedit Archive

The permanent public archive and search engine for
[Seedit](https://seedit.app) communities —
**[seeditarchive.org](https://seeditarchive.org)**, a
[Bitsocial Forge](https://bitsocialforge.com) product.

Seedit is a peer-to-peer client: it can open any community when a user already
knows its address, but it does not have a global content index. Seedit Archive
crawls the maintained Seedit discovery set continuously, keeps posts searchable
after they leave active community pages, and renders server-side pages for
search engines and durable public links.

The archive API is also the integration seam for Seedit's in-app full-text
search: the Seedit client's search bar queries this instance instead of turning
Seedit itself into a centralized crawler.

## Crawl scope

Seedit Archive does **not** crawl every community known to the shared Bitsocial
daemon. `scripts/build-communities.mjs` generates a deterministic union of:

- exact communities in
  [`seedit-default-subscriptions.json`](https://github.com/bitsocialnet/lists/blob/master/seedit-default-subscriptions.json); and
- every candidate in
  [`seedit-directories/`](https://github.com/bitsocialnet/lists/tree/master/seedit-directories).

That is currently 10 unique communities. Future directory candidates become
eligible when the generated list is refreshed, while unrelated 5chan boards
and unknown private addresses stay out of this instance.

## Architecture

Two deployments share this repository:

```text
            Bitsocial network (IPFS / IPNS / pubsub)
                           |
        bitsocial-cli daemon (PKC RPC, ws://localhost:9138)
                           |
 +------------------------------------------------------+
 | VPS 91.234.199.189                                   |
 | bitsocial-indexer server (Docker, 127.0.0.1:4002)   |
 | crawler -> SQLite + FTS5 -> Fastify read-only API   |
 | Caddy -> https://api.seeditarchive.org              |
 +-------------------------+----------------------------+
                           | REST + full-text search
 +-------------------------+----------------------------+
 | Vercel                                              |
 | Next.js SSR web UI -> https://seeditarchive.org     |
 +------------------------------------------------------+
                           |
                 Seedit in-app search (/search)
```

- **API + crawler** run beside the Bitsocial daemon and use its local-only PKC
  RPC endpoint; the daemon's remote auth key is not needed or stored here.
- **Web UI** is a GPL-3.0-or-later fork of the public
  [`bitsocial-indexer`](https://github.com/bitsocialnet/bitsocial-indexer)
  web UI, deployed to Vercel and pointed at the public read-only API.
- **Seedit remains separate.** This repository does not change the Seedit
  client; the client's in-app search lives in the Seedit repo and consumes the
  same public read-only API as everyone else.

## Repository layout

| Path | Purpose |
|---|---|
| `webui/` | Seedit Archive's server-rendered search and browse UI |
| `docker-compose.yml` | Runs the public indexer server from a pinned GHCR image and applies instance configuration |
| `config/communities.json` | Generated exact community addresses to crawl |
| `config/blocklist.json` | Operator takedown blocklist |
| `config/nsfw-overrides.json` | Operator NSFW overrides; they outrank every other NSFW signal |
| `scripts/build-communities.mjs` | Rebuilds the crawl scope from `bitsocialnet/lists` |
| `.env.example` | Documents server configuration; the real `.env` stays on the VPS |
| `DEPLOY.md` | VPS, Caddy, Cloudflare, and Vercel runbook |

## Local development

Same workflow as the other Bitsocial clients (5chan, seedit): one `yarn start`
runs the web UI on a stable named URL through
[portless](https://www.npmjs.com/package/portless) — no port numbers to
remember, and the browser opens by itself.

```bash
corepack yarn install     # root dev tooling, and webui/ deps via npm
corepack yarn start       # https://seeditarchive.localhost
```

| Command | What it does |
|---|---|
| `yarn start` | Next.js dev server (HMR) at `https://seeditarchive.localhost` |
| `yarn start:preview` | Production build of `webui/`, served at the same URL |
| `yarn build` | `next build` in `webui/` |
| `yarn type-check` | `tsc --noEmit` in `webui/` |
| `yarn communities:build` | Regenerates `config/communities.json` |

The first portless run asks for sudo once to bind port 443 and trust its local
CA. On a branch other than `master` the URL becomes
`https://<branch>.seeditarchive.localhost`, so several checkouts can run at the
same time. `PORTLESS=0 yarn start` skips portless and serves
`http://localhost:3000` instead (also the automatic Windows fallback).

Dev defaults live in `webui/.env.development`: the local UI reads the public
production API (`https://api.seeditarchive.org`), so `yarn start` shows the real
archive without running a crawler. Override anything in `webui/.env.local`
(gitignored) — e.g. `INDEXER_API=http://localhost:4000` to develop against a
local indexer from `docker-compose.yml`.

`webui/` keeps its own npm lockfile because Vercel deploys that directory as
the project root; the root yarn project owns only the dev workflow and installs
`webui/` for you.

The production crawler requires access to the authenticated Bitsocial daemon.
See [DEPLOY.md](DEPLOY.md) for the complete deployment and smoke-test flow.

## Maintenance

- **Refresh communities:** run `node scripts/build-communities.mjs`, commit the
  generated change, copy `config/` to the VPS, and restart only this instance.
- **Update the engine:** bump the `image:` tag in `docker-compose.yml` to the
  wanted `bitsocial-indexer` release, copy the file to the VPS, then
  `docker compose pull && docker compose up -d`.
- **Update the web UI:** make changes in `webui/`; Vercel deploys `master`.
- **Serve Seedit in-app search:** keep `https://seedit.app` and the canonical
  `https://seedit.localhost` dev origin in the API CORS allow-list; the client
  query experience itself lives in the Seedit repo.

## Content policy and takedowns

Seedit Archive mirrors content already accepted by independently moderated
communities and adds an operator-level removal mechanism:

- Only communities in the generated official Seedit scope are indexed.
- Posts still marked `pendingApproval` never enter the archive.
- Upstream moderator removals and author deletions become tombstones on a later
  crawl rather than remaining readable.
- Operator takedowns are applied through `config/blocklist.json`; the indexer
  watches the file and applies changes without a restart.

The blocklist is a valid JSON array. Entries may be bare CID strings or objects:

```json
[
  "QmExampleBareCid...",
  { "cid": "QmExampleCid...", "scope": "comment", "reason": "DMCA 2026-08-13" },
  { "cid": "QmExampleThreadCid...", "scope": "thread", "reason": "court order" }
]
```

`scope` is `comment` or `thread`; `reason` is an operator note and is never
served publicly. See [DEPLOY.md](DEPLOY.md) for the update command.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).

The runtime engine remains independently maintained at
[`bitsocialnet/bitsocial-indexer`](https://github.com/bitsocialnet/bitsocial-indexer).
