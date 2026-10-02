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

## UI provenance

The interface is a read-only clone of [Seedit](https://github.com/bitsocialnet/seedit)
(the old.reddit-style client), so archived pages look like the app they came from.

- `styles/seedit/` holds Seedit's CSS copied verbatim from Seedit commit
  `a4ed379e` (v0.6.0): its default `light` theme tokens, `index.css`, and the
  component and view CSS modules. Each file starts with a provenance header;
  re-sync by copying the source file again, not by editing the copy. The few
  bare element rules Next.js rejects inside CSS modules (`app.module.css`'s
  input rules, `sidebar.module.css`'s `a {}`) live in `app-elements.css` and
  `sidebar-elements.css`, loaded globally as Seedit loads them.
- `public/assets/` holds the Seedit images those styles and components use.
- `components/seedit/` are Server Component ports of Seedit's components
  (top bar, header, post row, thumbnail, reply, sidebar, search results,
  footer) that emit the same DOM structure and class names. Seedit's
  JavaScript toggles (expand a post, collapse a reply, dropdowns) are
  checkbox and `<details>` patterns here, so pages work without JavaScript;
  the only client component swaps a broken thumbnail for Seedit's link icon.
- `styles/archive.module.css` holds the archive-only additions: those toggles,
  Seedit's 640px/770px JavaScript viewport branches as media queries, and the
  archive's own sidebar and notice boxes.
- Post and reply bodies render as Markdown with Seedit's pipeline
  (`react-markdown`, `remark-gfm`, `rehype-sanitize` with Seedit's schema;
  images render as links, raw HTML as text).

The previous dark Bitsocial skin and its `THEME` variable (`default`/`5chan`)
were removed: Seedit's light theme is the only theme.

## Development

```bash
npm ci
npm run typecheck
npm run build
npm run dev
```

See `.env.example` for runtime variables and the repository's `DEPLOY.md` for
the production runbook.
