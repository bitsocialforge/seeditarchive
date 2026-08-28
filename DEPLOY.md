# Seedit Archive deployment runbook

Seedit Archive has two deployments: the **API/crawler** on
`91.234.199.189` beside the Bitsocial daemon, and the **web UI** on Vercel.
Cloudflare is authoritative for `seeditarchive.org` DNS.

Prerequisites: SSH access to `root@91.234.199.189`, DNS edit access for the
Cloudflare zone, GitHub access to `bitsocialforge/seeditarchive`, and a Vercel
CLI session in the `toms-projects-2188af94` team.

## 1. Generate and verify the crawl scope

```bash
node scripts/build-communities.mjs
jq length config/communities.json
```

The generator unions Seedit default subscriptions and every official Seedit
directory candidate. Inspect the diff before deployment; an unexpectedly empty
or 5chan-heavy list is a release blocker.

## 2. VPS API and crawler

The VPS has no credentials for this repository, so copy the small operational
surface from a trusted checkout:

```bash
ssh root@91.234.199.189 'install -d -m 0755 /opt/seeditarchive'
scp docker-compose.yml root@91.234.199.189:/opt/seeditarchive/
scp -r config root@91.234.199.189:/opt/seeditarchive/
```

Create `/opt/seeditarchive/.env` on the VPS with mode `0600`:

```dotenv
PKC_RPC_URL=ws://localhost:9138
SITE_URL=https://seeditarchive.org
ALLOWED_ORIGINS=https://seeditarchive.org,https://seedit.app,https://seedit.localhost
CRAWL_INTERVAL_MS=5000
CRAWL_CONCURRENCY=8
CRAWL_TIMEOUT_MS=30000
CRAWL_MAX_PAGES=20
```

Because this service uses host networking, `localhost` reaches the daemon as a
local connection. Do **not** copy the daemon's remote auth key into this env
file: it is unnecessary and dependency logs must never receive it.

Build and start only this Compose project:

```bash
cd /opt/seeditarchive
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 server
curl -sS http://127.0.0.1:4002/api/health | jq
```

Operational boundaries:

- host networking lets `ws://localhost:9138` reach the daemon;
- the API binds only `127.0.0.1:4002` (`4001` belongs to the host's IPFS daemon);
- the V8 heap starts at 512 MiB with a 1 GiB container limit;
- SQLite persists in the `seeditarchive_data` Docker volume; and
- the engine builds from `bitsocial-indexer`'s `master` branch.

## 3. Caddy

Add a single vhost to `/etc/caddy/Caddyfile`:

```caddy
# Seedit Archive — API/crawler (-> 127.0.0.1:4002)
api.seeditarchive.org {
	encode zstd gzip
	reverse_proxy 127.0.0.1:4002
}
```

Back up the file, validate, and reload Caddy. Reload rather than restart because
the host serves other production sites:

```bash
cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak-seeditarchive
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

## 4. Cloudflare DNS

All three records are DNS-only:

| Type | Name | Value |
|---|---|---|
| `A` | `api` | `91.234.199.189` |
| `A` | `@` | `76.76.21.21` |
| `CNAME` | `www` | `cname.vercel-dns.com` |

Keeping `api` DNS-only lets Caddy complete ACME and terminate TLS itself.

## 5. Vercel web UI

Create or link the `seeditarchive` project with `webui/` as the project root
and `master` as the production branch:

```bash
cd webui
vercel link --yes --project seeditarchive --scope toms-projects-2188af94
```

Production environment:

| Variable | Value |
|---|---|
| `INDEXER_API` | `https://api.seeditarchive.org` |
| `SITE_NAME` | `Seedit Archive` |
| `SITE_BADGE` | empty string |
| `SITE_URL` | `https://seeditarchive.org` |
| `THEME` | `default` |
| `BRAND_TEXT` | `A Bitsocial Forge product` |
| `BRAND_URL` | `https://bitsocialforge.com` |
| `CONTACT_EMAIL` | a monitored takedown address, once configured |

Attach both domains:

```bash
vercel domains add seeditarchive.org --scope toms-projects-2188af94
vercel domains add www.seeditarchive.org --scope toms-projects-2188af94
```

The project is connected to `bitsocialforge/seeditarchive`, with `webui/` as
its Vercel root and `master` as its production branch. Production deploys are
Git-based: pushing a validated commit to `master` builds and promotes the web
UI automatically.

## 6. Acceptance checks

```bash
curl -fsS https://api.seeditarchive.org/api/health | jq
curl -fsSI https://seeditarchive.org
curl -fsS https://seeditarchive.org/robots.txt
curl -fsS https://seeditarchive.org/sitemap.xml
curl -fsSI https://www.seeditarchive.org
```

Also verify:

- the health count matches `config/communities.json` after the first crawl;
- `/api/communities` contains Seedit communities and no 5chan-only boards;
- a real query returns indexed Seedit content;
- view-source contains server-rendered post content;
- the CORS allowlist echoes exactly the listed origins. The engine defaults to
  `*` when `ALLOWED_ORIGINS` is unset, so this is the check that catches a
  missing, misspelled, or unexported env var — without it, an open API looks
  identical to a correctly configured one:

  ```bash
  # The first three origins must be echoed back; the last must not.
  for o in https://seeditarchive.org https://seedit.app https://seedit.localhost https://unlisted.example; do
    printf '%s -> ' "$o"
    curl -sS -D - -o /dev/null -H "Origin: $o" \
      'https://api.seeditarchive.org/api/search?q=test&limit=1' \
      | grep -i '^access-control-allow-origin:' || echo '(none — correctly blocked)'
  done
  ```

- `/legal` displays a monitored contact before public promotion.

## Updates

| Change | Action |
|---|---|
| Community scope | Regenerate, copy `config/`, then `docker compose restart server` |
| Takedown blocklist | Copy `config/blocklist.json`; no restart is required |
| Indexer engine | `docker compose build --no-cache && docker compose up -d` |
| Web UI | Push `master`; Vercel builds the linked `webui/` project automatically |
| Compose/env conventions | Copy `docker-compose.yml`, then recreate only this service |
