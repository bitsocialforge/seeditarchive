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

The archive API is also the integration seam for Seedit's planned in-app
full-text search. That later client change will query this instance instead of
turning Seedit itself into a centralized crawler.

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
                 planned Seedit in-app search
```

- **API + crawler** run beside the Bitsocial daemon, so its authenticated PKC
  RPC URL never leaves the VPS.
- **Web UI** is a GPL-3.0-or-later fork of the public
  [`bitsocial-indexer`](https://github.com/bitsocialnet/bitsocial-indexer)
  web UI, deployed to Vercel and pointed at the public read-only API.
- **Seedit remains separate.** This repository does not change the Seedit
  client; in-app search is the next phase after the archive is stable live.

## Repository layout

| Path | Purpose |
|---|---|
| `webui/` | Seedit Archive's server-rendered search and browse UI |
| `docker-compose.yml` | Builds the public indexer server and applies instance configuration |
| `config/communities.json` | Generated exact community addresses to crawl |
| `config/blocklist.json` | Operator takedown blocklist |
| `scripts/build-communities.mjs` | Rebuilds the crawl scope from `bitsocialnet/lists` |
| `.env.example` | Documents server configuration; the real `.env` stays on the VPS |
| `DEPLOY.md` | VPS, Caddy, Cloudflare, and Vercel runbook |

## Local checks

```bash
node scripts/build-communities.mjs

cd webui
npm ci
npm run typecheck
npm run build
```

The production crawler requires access to the authenticated Bitsocial daemon.
See [DEPLOY.md](DEPLOY.md) for the complete deployment and smoke-test flow.

## Maintenance

- **Refresh communities:** run `node scripts/build-communities.mjs`, commit the
  generated change, copy `config/` to the VPS, and restart only this instance.
- **Update the engine:** rebuild the Compose service from the public
  `bitsocial-indexer` `master` branch.
- **Update the web UI:** make changes in `webui/`; Vercel deploys `master`.
- **Prepare Seedit integration:** keep `https://seedit.app` in the API CORS
  allow-list, then implement the client query experience in the Seedit repo as
  a separate reviewed change.

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
