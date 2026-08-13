# Seedit Archive web UI

Next.js App Router frontend for
[seeditarchive.org](https://seeditarchive.org), rendering the public Seedit
Archive API configured through `INDEXER_API`.

## Provenance and license

This directory is derived from the GPL-3.0-or-later `webui/` in
[`bitsocialnet/bitsocial-indexer`](https://github.com/bitsocialnet/bitsocial-indexer),
with Seedit Archive deployment branding and Vercel Web Analytics. It remains
GPL-3.0-or-later; see the repository root [LICENSE](../LICENSE).

Upstream is the neutral reference. Instance-specific UI changes happen here
and upstream improvements are ported deliberately.

## Development

```bash
npm ci
npm run typecheck
npm run build
npm run dev
```

See `.env.example` for runtime variables and the repository's `DEPLOY.md` for
the production runbook.
