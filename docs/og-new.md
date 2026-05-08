# `@jxdltd/tanstack/og` — Design plan

A zero-config Vite plugin that generates Open Graph images and injects the matching meta tags for any TanStack Start site.

> **Companion doc:** [`og-current.md`](./og-current.md) describes how `auvia.io` does this today. This plan generalizes that approach so any TanStack Start project can adopt it with one plugin entry and one head spread.

## Goals

- **One-line install.** Add the plugin to `vite.config.ts`. Everything else has sensible defaults.
- **One-line wiring.** Spread our helper into the root route's `head()` and OG meta tags appear on every page automatically.
- **Source of truth = `head()`.** Title, description, and explicit image come from each route's existing `head()`. The plugin never asks users to duplicate metadata.
- **Static-first, dynamic-capable.** Prerender PNGs for every static route at build time. For routes with params, ship an on-demand server endpoint so users don't have to choose between SSG and dynamic content.
- **Framework-agnostic content layer.** Works with content-collections, MDX, fetch-from-DB loaders, or anything else — because it only reads `head()` output.
- **Bring your own template.** Default template is opinionated and good. Power users replace it with a JSX function.

## Non-goals

- Browser-automation rendering (Puppeteer/Playwright). Satori + Resvg covers 95% of designs and is two orders of magnitude faster.
- Sitemaps, robots.txt, full SEO suite. Out of scope; this is the OG/Twitter card slice.
- Non-Vite TanStack frameworks (CRA, Webpack ports). We bind to Vite hooks deliberately.

## Target user experience

**Install:**

```ts
// vite.config.ts
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { og } from "@jxdltd/tanstack/og";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tanstackStart(),
    og(), // <- that's it
    viteReact(),
    nitro(),
  ],
});
```

**Wire once in the root route:**

```tsx
// src/routes/__root.tsx
import { ogMeta } from "@jxdltd/tanstack/og/router";

export const Route = createRootRoute({
  head: (ctx) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width,initial-scale=1" },
      ...ogMeta(ctx), // <- emits og:image / twitter:image / og:type, etc.
    ],
  }),
  component: RootComponent,
});
```

**Override per route (optional):**

```tsx
// src/routes/blog/$slug.tsx
export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => fetchPost(params.slug),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData.title }, { name: "description", content: loaderData.excerpt }],
  }),
  staticData: {
    og: { template: "post", tag: loaderData?.tag }, // optional override
  },
});
```

**That is the entire user-facing surface.** No manifest. No build script. No manual image references in `head()`.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Vite plugin: og()                                                   │
│                                                                      │
│  configResolved ─► read tanstackStart() config (prerender, srcDir)   │
│                    capture base, publicDir, root                     │
│                                                                      │
│  buildStart     ─► walk srcDir/routes  OR  parse routeTree.gen.ts    │
│                    build RouteManifest = [{ path, file, hasParams }] │
│                                                                      │
│  resolveId/load ─► virtual:tanstack-og/manifest                      │
│                    virtual:tanstack-og/template (user template)      │
│                                                                      │
│  configureServer (dev)                                               │
│                 ─► middleware: GET /__og/*.png                       │
│                    render on-demand via satori + resvg               │
│                    LRU memoize on (path, head digest)                │
│                                                                      │
│  closeBundle (client build)                                          │
│                 ─► for each static path:                             │
│                      run loader + head() in worker (loaded from SSR  │
│                        build output)                                 │
│                      → render template → satori → resvg → PNG       │
│                      → emitFile to dist/og/<slug>.png                │
│                    write build manifest dist/og/manifest.json         │
│                                                                      │
│  emit server route                                                   │
│                 ─► /__og/$.png (dynamic) backed by runtime renderer │
│                    used in prod for routes the build couldn't        │
│                    enumerate (params, conditional content)           │
└──────────────────────────────────────────────────────────────────────┘

User code
─────────
__root.head() spreads ogMeta(ctx)
  → at SSR/render time, ogMeta inspects ctx.matches to derive
    the current route's OG image URL + canonical og:* tags
  → URL points at /og/<slug>.png (static) or /__og/<slug>.png (dynamic)
```

## Components

### 1. Vite plugin (`@jxdltd/tanstack/og`)

Default export `og(options?)` returns an array of Vite plugins (we may split into a router-tap plugin and an asset-emit plugin so they can be ordered correctly relative to `tanstackStart` and the router plugin).

Key hooks:

| Hook                             | Responsibility                                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `config`                         | Inject sensible defaults; ensure `publicDir` accessible.                                                          |
| `configResolved`                 | Find the sibling `tanstackStart` plugin in `config.plugins`, read its `prerender` settings (filter, pages, base). |
| `buildStart`                     | Build the route manifest.                                                                                         |
| `resolveId` + `load`             | Serve virtual modules (manifest, template, runtime helpers).                                                      |
| `configureServer`                | Mount dev middleware at `/og/*.png` and `/__og/*.png`.                                                            |
| `handleHotUpdate`                | Invalidate dev OG cache when route files, loader sources, or template change.                                     |
| `generateBundle` / `closeBundle` | Emit static PNGs and write `og/manifest.json`.                                                                    |

### 2. Route discovery

Two strategies, fall through in order:

1. **Read `routeTree.gen.ts`.** After `@tanstack/router-plugin` has run, the file exists and contains the full route hierarchy with `path` and `id` strings. We import it via Vite's module graph (or read + parse the file directly). Most accurate, no convention duplication.
2. **Walk `src/routes/`.** Same conventions the router plugin uses (`__root`, `_layout`, `$param`, `[.]ext` server routes, `routeFileIgnorePrefix`). We get this from the router plugin's resolved options where possible. Used as a fallback if `routeTree.gen.ts` isn't available yet (very early `buildStart` situations).

For each entry we capture:

```ts
type RouteEntry = {
  routePath: string; // "/blog/$slug"
  routeFile: string; // absolute path
  hasParams: boolean;
  isLayout: boolean;
  isApiRoute: boolean;
};
```

We filter out layout-only routes, server routes, and routes the user excluded via `filter`.

### 3. Build-time rendering pipeline

For each **static** path (no params, not filtered out, not in user opt-out):

1. Spawn a Node worker that imports the SSR build output (Vite's SSR bundle gives us the route module, including `loader` and `head`). For Start projects we follow the same path TanStack Start's prerender uses.
2. Call the route's `loader` with synthesized `params` (none for static routes) to get `loaderData`.
3. Call `head({ params, loaderData, matches, match })` and extract:
   - `title`
   - `description` (from `meta` array)
   - `image` (from existing `og:image` if user set it explicitly)
   - any `staticData.og` override
4. Pass `{ route, head, loaderData, staticData.og }` to the template function.
5. Render: `satori(jsx, { width, height, fonts })` → SVG → `new Resvg(svg).render().asPng()` → Buffer.
6. `this.emitFile({ type: "asset", fileName: \`og/${slug}.png\`, source: pngBuffer })`.
7. Append `{ path, slug, hash, contentType: "image/png" }` to `og/manifest.json` so the runtime helper can resolve URLs deterministically.

For **dynamic** routes (params), we don't enumerate at build time by default. We expose:

- A user opt-in to enumerate via `routes: { dynamic: { "/blog/$slug": (manifest) => ["/blog/foo", ...] } }`. Often backed by content-collections.
- A built-in server route (next section) so dynamic routes still get a working OG URL at runtime.

If `tanstackStart({ prerender })` is configured, we **reuse** that configuration. Any `pages: [...]` entries become enumerated dynamic routes for free; `filter` is shared. This means users who already prerender don't repeat themselves.

### 4. Dev middleware

`configureServer` mounts `/og/*.png` and `/__og/*.png`. Behavior:

1. Match the incoming request path → resolve to a route in the manifest.
2. Use the dev SSR module loader (`server.environments.ssr.runner.import(routeFile)`) to invoke `loader` + `head()`.
3. Render the same way as build time, with an in-memory LRU keyed on `(path, sha256(head + loaderData))`.
4. Respond with `Content-Type: image/png` and `Cache-Control: no-store` in dev.

`handleHotUpdate` clears the LRU entries that involve the changed file's route module or any of its imported transitive sources for templates/fonts.

This means **OG images Just Work in dev** — devs see the live image at `/og/blog/$slug.png` while iterating on a post.

### 5. Production server route for dynamic OG

For dynamic routes (or anything not prerendered), the plugin emits a TanStack Start server route at `routes/__og/$.png.ts` (virtual; written into the SSR bundle) that:

1. Parses the request path back into a route + params (using the manifest).
2. Imports the matched route module from the SSR build.
3. Runs `loader` + `head` exactly like the dev middleware.
4. Renders and returns the PNG, with `Cache-Control: public, max-age=31536000, immutable` keyed on a content hash query string the runtime helper appends.

This is opt-in only when needed — we detect at build time whether any route has params or is excluded from the prerender set, and only emit the server route in that case. Pure-static sites pay zero runtime cost.

### 6. Meta injection helper

Exported as `@jxdltd/tanstack/og/router`:

```ts
export function ogMeta(ctx: HeadContext): MetaEntry[];
```

It reads:

- `ctx.matches` to find the deepest matched route's `path`.
- A virtual manifest module (`virtual:tanstack-og/manifest`) the plugin generates with `{ path → imageUrl }` mappings, including content hashes.
- The same `head` data already being constructed (title, description) so it can fill `og:title`, `og:description`, `twitter:title`, `twitter:description` consistently.
- Plugin config (siteName, siteUrl, twitterHandle, defaultType) injected via the same virtual module.

Returns the canonical set of tags (mirrors `auvia`'s `pageMeta`):

```ts
[
  { property: "og:type", content: "website" | "article" },
  { property: "og:site_name", content: siteName },
  { property: "og:title", content: title },
  { property: "og:description", content: description },
  { property: "og:url", content: canonicalUrl },
  { property: "og:image", content: absImageUrl },
  { property: "og:image:alt", content: title },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:title", content: title },
  { name: "twitter:description", content: description },
  { name: "twitter:image", content: absImageUrl },
  // article:published_time when type=article and date in staticData.og
];
```

Because root `head()` deduplicates by `name`/`property`, per-route `head()` can override any of these by emitting its own entry — preserving full user control.

### 7. Default template

Bundled JSX template that renders:

- Site name (small, top-left)
- Page title (large, wraps gracefully across 1–3 lines, accent underline on trailing word)
- Description (one-line truncated)
- Article metadata row (author / date / reading time) when `og:type === "article"`

Tuned for legibility at 1200×630 and at thumbnail size in feed previews. Looks good with the bundled default font.

### 8. Cache

Two layers:

- **In-memory LRU** for dev requests.
- **Disk cache** at `node_modules/.cache/tanstack-og/<hash>.png`, keyed on `sha256(template_source + font_set + head_object + loader_data + plugin_version)`. Build pass checks the disk cache first; only renders on miss. The cache lives outside `dist/` so `vite build --emptyOutDir` doesn't nuke it.

This addresses the auvia gotcha where template tweaks didn't invalidate the per-PNG hash file: the cache key includes the template source.

### 9. Fonts

- **Bundled default**: a single Inter Regular subset (~50 KB) compiled into the package as base64. Zero install steps, decent typography out of the box.
- **User override** via `og({ fonts: [{ name: "Geist", data: "./fonts/Geist.ttf", weight: 500 }] })`. Accepts file paths, URLs, or `Buffer`s.
- **Auto-detect Geist** if `geist` is in the user's deps and `fonts` is not provided — opportunistic upgrade, no breaking changes.

## Configuration API

```ts
type OgOptions = {
  // Output
  width?: number; // default 1200
  height?: number; // default 630
  outputDir?: string; // default "og"

  // Site metadata (used in og:* tags + canonical URLs)
  siteName?: string; // defaults to package.json name
  siteUrl?: string; // defaults to env SITE_URL or VITE_SITE_URL; required for absolute og:image URLs in social crawlers
  twitterHandle?: string;
  defaultType?: "website" | "article";

  // Routes
  routes?:
    | "auto" // discover from route tree
    | { include?: string[]; exclude?: string[] }
    | { dynamic?: Record<string, () => string[] | Promise<string[]>> };
  filter?: (entry: RouteEntry) => boolean; // composes with above

  // Template
  template?: "default" | OgTemplateFn;
  // (template, type) keyed map allows per-type templates without writing a discriminator
  templates?: Record<string, OgTemplateFn>;

  // Fonts
  fonts?: Array<{
    name: string;
    data: string | Buffer | URL;
    weight?: number;
    style?: "normal" | "italic";
  }>;

  // Caching
  cache?: boolean | { dir?: string };

  // Meta injection
  injectMeta?: boolean; // default true; disables ogMeta if false

  // Dev
  dev?: {
    onDemand?: boolean; // default true
    watch?: boolean; // default true
  };

  // Emit a runtime server route for dynamic params
  runtime?: boolean | "auto"; // default "auto" – on if any unenumerated dynamic routes exist
};

type OgTemplateFn = (ctx: {
  route: { path: string; params?: Record<string, string> };
  head: { title: string; description?: string; image?: string };
  loaderData: unknown;
  staticData?: { og?: Record<string, unknown> };
  config: ResolvedOgConfig;
}) => React.ReactNode;
```

Sensible defaults mean **the empty `og()` call is a fully working install**. Every option above is optional.

## Build flow

```
0. Vite resolves plugins. og() registers, and configResolved
   captures sibling tanstackStart() prerender config.

1. Router plugin runs → src/routeTree.gen.ts is up to date.

2. og() buildStart parses the route tree → RouteManifest.

3. Vite builds SSR bundle (TanStack Start phase).
   og()'s virtual:tanstack-og/manifest module is included so
   SSR-rendered HTML's <meta> tags reference correct image URLs.

4. Vite builds client bundle.

5. og()'s closeBundle:
   - Loads each static route module from the SSR build output
   - Runs loader → head() → template → satori → resvg
   - Checks disk cache; emits PNG if cache miss
   - Writes manifest.json with { path, url, hash } per entry

6. If runtime is enabled:
   - Emits the /__og/$.png server route into the Nitro build

7. Nitro packages .output/.
```

Everything fits inside `vite build`. No separate `og` script in `package.json` (unlike the auvia setup that runs `pnpm og && vite build`).

## Dev flow

```
vite dev
  └─ og() configureServer
       middleware: GET /og/<route>.png and /__og/<route>.png
           → look up route in manifest
           → import route module from SSR runner
           → call loader + head()
           → render template; sha256 cache key in LRU
           → respond image/png
       handleHotUpdate
           → invalidate cache entries touching the changed module
```

Result: edits to a post's frontmatter or to the template hot-reload the OG image at the same URL the page references. No manual rebuild.

## Runtime flow (production)

For static routes: the meta tag points at `/og/<slug>.png?v=<hash>`. Hash is the build-time content hash. The PNG is a static file, served from CDN edges.

For dynamic routes: the meta tag points at `/__og/<encoded-path>.png?v=<hash>`. The Nitro server route renders on demand and caches per `(path, hash)` — typically with `Cache-Control: public, max-age=31536000, immutable` and an LRU on the server.

## Edge cases & gotchas

| Issue                                                | Resolution                                                                                                                                                                                                                          |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auvia's manual manifest of static pages**          | Auto-discovery from the route tree. No manifest file; `staticData.og` is the only per-route knob.                                                                                                                                   |
| **Auvia's hash cache missing template invalidation** | Cache key includes template source hash + font set + plugin version.                                                                                                                                                                |
| **Fixed 1200×630**                                   | Configurable per-instance, plus a `templates` map for per-type variants (e.g., square 1080×1080 for Mastodon).                                                                                                                      |
| **No runtime generation**                            | Built-in `/__og/$.png` server route covers dynamic params and conditional content.                                                                                                                                                  |
| **Geist font lock-in**                               | Bundled default font; opt-in to Geist or any other; no hard dependency.                                                                                                                                                             |
| **`SITE_URL` brittleness**                           | `siteUrl` plugin option, fallback to `VITE_SITE_URL`/`SITE_URL` env, fallback to relative URLs (which work in dev and on same-origin crawlers). Warn when absolute URLs are required but unresolved.                                |
| **Routes that fail to load (loader throws)**         | Skip with a warning; continue building. Don't fail the build over a single OG image unless `failOnError: true`.                                                                                                                     |
| **SPA mode (no SSR head)**                           | OG meta still works in `<head>` because Start's SPA shell prerenders to `_shell.html`. The plugin's static set in SPA mode is the shell + any explicitly enumerated paths. Document this.                                           |
| **TanStack Solid**                                   | Out of scope for v1, but the plugin core (route discovery, satori, manifest) is framework-neutral. Solid support could be added by parameterizing the `head()` invocation.                                                          |
| **Streaming SSR + meta**                             | TanStack Start emits `<HeadContent />` in the document head before any streaming body, so `og:*` tags are flushed in the initial response. No special handling needed.                                                              |
| **Crawlers ignoring relative URLs**                  | Where `siteUrl` is set, all `og:image` and `twitter:image` URLs are absolute. We log a warning if `siteUrl` is missing in production builds.                                                                                        |
| **Image URL stability for cached shares**            | Default to path-based URLs (`/og/blog/foo.png`) for stability; append `?v=<hash>` for cache busting. Crawlers that strip query strings still get the right image (URL path stable); crawlers that respect them get fresh content.   |
| **CJK / multi-script titles**                        | Default font ships Latin only. Document how to add CJK fonts; consider an opt-in `unicodeRanges` option that lazy-loads NotoSans subsets.                                                                                           |
| **Large sites (1000+ posts)**                        | Worker pool with `concurrency` matching CPU count; resumable cache; build-only emits PNGs that changed. Profile: at ~50ms/render, 10k routes ≈ 8 min single-threaded → ~1 min with 8 workers, then near-zero on incremental builds. |

## Comparison to alternatives

| Approach                                            | Tradeoff                                                                                                                      |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Hand-rolled per-project (auvia today)**           | Zero abstraction overhead; every project re-implements caching, font loading, route discovery, meta injection.                |
| **Server-route-only (`/api/og.png?title=...`)**     | Simple, but each route must hand-construct its own OG URL with stringified params. Doesn't share `head()`. Doesn't prerender. |
| **`@vercel/og` standalone**                         | Works on edge; needs runtime traffic for static OG images; awkward outside Next/Vercel.                                       |
| **Browser-screenshot (puppeteer/`remix-og-image`)** | High fidelity for arbitrary CSS; slow, heavy install, painful in CI.                                                          |
| **`vite-plugin-og`/community plugins**              | Generic; not aware of TanStack Start `head()` or routes. We win on integration.                                               |

## Phased implementation

### Phase 1 — MVP (static prerender)

- [ ] `og()` plugin scaffolding, options parsing, defaults.
- [ ] Route discovery via `routeTree.gen.ts` parser.
- [ ] Worker that loads SSR bundle and invokes `loader + head()`.
- [ ] Default JSX template.
- [ ] Bundled Inter font.
- [ ] Satori + Resvg rendering pipeline.
- [ ] `closeBundle` emits PNGs; writes `manifest.json`.
- [ ] `@jxdltd/tanstack/og/router` exports `ogMeta(ctx)`.
- [ ] Disk cache with template+font version keys.

**Exit criteria:** `vite build` on the `tanstack` website (this repo's `apps/website`) produces working OG images for all static routes, with one plugin entry and one `head()` spread.

### Phase 2 — Dev middleware

- [ ] `configureServer` middleware mounting `/og/*.png` + `/__og/*.png`.
- [ ] Live re-render on `handleHotUpdate`.
- [ ] LRU memoization with reasonable size cap.

**Exit criteria:** editing a route file or template re-renders OG live in dev within a single HMR cycle.

### Phase 3 — Dynamic routes

- [ ] User-supplied dynamic enumeration (`routes.dynamic`).
- [ ] Auto-bridge to `tanstackStart({ prerender: { pages } })` so users configure paths once.
- [ ] Emit `/__og/$.png` Nitro server route when needed.
- [ ] Server-side LRU + immutable cache headers.

**Exit criteria:** a blog with 50 dynamic posts gets prerendered OGs; a brand-new post gets a runtime OG without redeploying.

### Phase 4 — Polish

- [ ] `templates` map for per-type variants.
- [ ] Auto-detect Geist; pluggable font registry.
- [ ] Optional `unicodeRanges` for CJK fallback.
- [ ] `failOnError`, `concurrency`, build telemetry.
- [ ] Docs site with playground (drop a JSX template, see live preview).

### Phase 5 — Stretch

- [ ] Solid Start support (`@tanstack/solid-start`).
- [ ] Per-platform sizes (Mastodon square, Pinterest portrait) via the templates map.
- [ ] CLI: `npx tanstack-og preview /blog/foo` to render+open a single PNG locally.
- [ ] Storybook-style template gallery.

## Open questions

1. **Where in the plugin chain do we sit relative to `tanstackStart()`?** We need its config (`prerender`, `srcDirectory`) at `configResolved`. Confirm Vite plugin ordering guarantees and whether `tanstackStart()` exposes its resolved options on the plugin instance — if not, we duplicate a small amount of config (`srcDirectory`).
2. **Loader execution model.** Running route loaders in a worker requires the SSR bundle to expose them. TanStack Start's prerender already does this; we should reuse the same module loader if it's exposed. Otherwise, an in-process import of the SSR bundle is simpler but blocks the main build thread.
3. **`staticData` API stability.** TanStack Router's `staticData` is the obvious place for `og: { template, ... }` overrides. Verify it survives codegen and is reachable from a build-time route walk without executing the route module.
4. **Type safety for `template` callbacks.** The template gets `loaderData` typed as `unknown` because we can't infer it across routes generically. Could expose a `defineOgTemplate<TLoaderData>()` helper for typed overrides per route.
5. **Bundling Resvg.** `@resvg/resvg-js` is a native module. Mark `external` for SSR and run only inside the build worker. Works in Nitro at runtime only on Node platforms — for Cloudflare Workers, fall back to `@resvg/resvg-wasm`. Detect target adapter and swap.
6. **Cache-busting strategy with edge CDNs.** Path-stable URLs with `?v=<hash>` — confirm major social crawlers (FB, X, LinkedIn, Slack, Discord) handle the query string consistently.

## TL;DR

A Vite plugin that walks the TanStack Start route tree, runs each route's existing `head()` + `loader` to derive title/description/image data, renders a JSX template with Satori + Resvg, emits PNGs at build time (and on demand in dev / for dynamic routes), and ships a one-call helper that injects the matching `og:*` and `twitter:*` meta tags. All the auvia gotchas — manual manifest, fixed sizes, build-time-only, font lock-in, template cache invalidation, `SITE_URL` brittleness — are addressed by design.
