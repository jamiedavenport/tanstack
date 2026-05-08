# Open Graph generation in `auvia.io` (current state)

A snapshot of how `auvia.io` generates Open Graph images and meta tags today, captured to inform the design of `@jxdltd/tanstack/og`.

## Stack

- **Framework:** TanStack Start (Vite-based SSR for React 19) with file-based routing under `src/routes/`.
- **Image rendering:** [`satori`](https://github.com/vercel/satori) (JSX → SVG) + [`@resvg/resvg-js`](https://github.com/yisibl/resvg-js) (SVG → PNG).
- **Content:** `@content-collections/*` reads MDX from `content/blog/`.
- **Fonts:** `geist` (Regular / Medium / Black) loaded from `node_modules` at build time.

## Pipeline

OG images are generated **at build time** as static PNGs and committed to `public/og/`. The route's `head()` function then references those static URLs.

```
pnpm build
  └─ pnpm og              # scripts/og/generate.ts
       ├─ load Geist fonts
       ├─ load static entries from manifest.ts
       ├─ scan content/blog/*.mdx
       └─ for each entry:
            ├─ sha256(inputs) → check sibling .hash file
            ├─ on miss: JSX template → satori → SVG → resvg → PNG
            └─ write public/og/<slug>.png + .hash
  └─ vite build           # client + SSR + nitro
```

At request time, TanStack Start's SSR calls each route's `head()` to serialize `<title>`, `<meta>`, and `<link>` tags into the response. The OG image is just a static URL on the same origin.

## Image generation

**Entry point:** `scripts/og/generate.ts`

Core renderer (`scripts/og/generate.ts:108-111`):

```ts
async function renderPng(node: React.ReactNode): Promise<Buffer> {
  const svg = await satori(node, { width: 1200, height: 630, fonts });
  return Buffer.from(new Resvg(svg).render().asPng());
}
```

- Fixed canvas: **1200×630**.
- Cache: SHA-256 of the input JSON written to a sibling `.png.hash`; re-render is skipped on a match (`scripts/og/generate.ts:113-129`).
- Font loading: Geist TTFs read from `node_modules/geist/...` at build time (`scripts/og/generate.ts:12-40`).

**Templates:** `scripts/og/template.tsx`

- `pageCard` (lines 113–183) — generic page card.
- `postCard` (lines 193–250) — blog post card with author, date, reading time.
- Responsive title sizing (52–80px) and an accent underline on the trailing 1–2 words (`scripts/og/template.tsx:81-105`).

**Inputs:**

- **Static pages** are listed manually in `scripts/og/manifest.ts:9-34` (home, blog index, privacy).
- **Blog posts** are auto-discovered from `content/blog/*.mdx`. Frontmatter schema in `content-collections.ts:17-23`:

  ```ts
  z.object({
    title: z.string(),
    excerpt: z.string(),
    date: z.string(),
    tag: z.string().optional(),
    author: z.string().optional(),
  });
  ```

- Reading time: words ÷ 200, after stripping code/markdown/HTML (`scripts/og/generate.ts:71-79`, `content-collections.ts:46-55`).

**Outputs:** `public/og/`

- `home.png`, `blog.png`, `privacy.png`
- `blog/<slug>.png` per post
- `<name>.png.hash` next to each PNG for cache validation

## Meta tag injection

**Helper:** `src/lib/seo.ts` exposes `pageMeta(...)` (`src/lib/seo.ts:13-57`) which builds the `{ meta, links }` payload that TanStack Start expects from `head()`.

Tags emitted:

| Tag                                                                     | Notes                                          |
| ----------------------------------------------------------------------- | ---------------------------------------------- |
| `<title>`                                                               | Always                                         |
| `<meta name="description">`                                             | Always                                         |
| `<meta property="og:type">`                                             | `'website'` or `'article'`                     |
| `<meta property="og:site_name">`                                        | `'auvia'`                                      |
| `<meta property="og:title">` / `og:description` / `og:url`              | Always                                         |
| `<meta property="og:image">` / `og:image:alt`                           | When `image` provided                          |
| `<meta name="twitter:card">`                                            | `'summary_large_image'`                        |
| `<meta name="twitter:title">` / `twitter:description` / `twitter:image` | Always (image conditional)                     |
| `<meta property="article:published_time">`                              | When `type: 'article'` and `publishedTime` set |
| `<link rel="canonical">`                                                | Always                                         |

URL handling: `pageMeta` detects whether `image` is relative (`/og/...`) and prepends `SITE_URL` for absolute URLs in tags (`src/lib/seo.ts:22-26`).

**Per-route usage:**

- Root globals (charset, viewport, font preconnects, favicon, sitemap): `src/routes/__root.tsx:27-49`.
- Home: `src/routes/index.tsx:17-26`.
- Blog index: `src/routes/blog/index.tsx:9-18`.
- Blog post (uses route loader data): `src/routes/blog/$slug.tsx:9-26`.
- Privacy: `src/routes/privacy.tsx:7-16`.

## Dependencies

From `package.json`:

- `satori@0.26.0` (devDependency)
- `@resvg/resvg-js@2.6.2` (devDependency)
- `geist@1.7.0` (devDependency)
- `@content-collections/core` / `mdx` / `vite`
- `@tanstack/react-start`, `@tanstack/react-router`

Build wiring: `package.json:11` runs `pnpm og && vite build` so PNGs exist before Vite copies `public/`.

## Gotchas

- **Manual manifest for static pages.** New static routes require an entry in `scripts/og/manifest.ts` — they aren't auto-discovered.
- **Hash-based cache.** Stale PNGs persist if `.hash` files are deleted independently of the PNG, or if the input shape changes silently (e.g. template tweaks without touching inputs would not invalidate). Template changes therefore need a manual cache bust.
- **Fixed 1200×630.** No alternate aspect ratios or per-platform variants.
- **Build-time only.** Posts published without re-running `pnpm og` won't have an OG image; runtime generation is not supported.
- **Font weight set is fixed** (Regular / Medium / Black). Templates can't pull in additional weights without editing the loader.
- **No dev/prod divergence.** Images are static files under `public/`, so dev and prod serve identical assets.
- **Absolute URL construction depends on `SITE_URL`.** Missing or wrong env value silently produces broken `og:image` URLs.

## Key files (for reference)

| File                      | Purpose                                                                    |
| ------------------------- | -------------------------------------------------------------------------- |
| `scripts/og/generate.ts`  | Build script: load fonts, iterate entries, render PNGs, manage hash cache. |
| `scripts/og/template.tsx` | JSX templates (`pageCard`, `postCard`).                                    |
| `scripts/og/manifest.ts`  | Static page entries.                                                       |
| `src/lib/seo.ts`          | `pageMeta()` helper that builds TanStack Start `head` payload.             |
| `src/routes/__root.tsx`   | Global head (favicon, fonts, sitemap, etc.).                               |
| `src/routes/**/*.tsx`     | Per-route `head()` calling `pageMeta`.                                     |
| `content-collections.ts`  | Frontmatter schema and reading-time computation.                           |
| `package.json`            | Build pipeline wiring (`build` runs `og` first).                           |
