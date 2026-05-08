# `@jxdltd/tanstack/og` — Design plan

A small library (with an optional thin Vite plugin) that turns a typed config file + a JSX template into a single OG-image API route for any TanStack Start site. Cache-Control headers and a CDN make it perform like a static asset — without the build-pipeline machinery.

> **Companion:** [`og-current.md`](./og-current.md) describes how `auvia.io` does this today (build-time PNGs, manual manifest, fixed dimensions). This plan generalises and simplifies it.

## Why a config file (not auto-extraction from `head()`)

An earlier draft tried to be clever: discover routes automatically, run each route's `loader` + `head()` from a Vite plugin, scrape `og:title` / `og:description` out of the meta array, and pass `loaderData` to the template as `unknown`. Two problems:

1. **`head()` is not a sufficient source of truth.** OG cards typically need fields `head()` doesn't carry (author, date, tag, hero, reading time). For real content-driven sites (e.g. auvia) you end up reading those out of `loaderData` anyway — untyped — and per-route the template has to know what shape `loaderData` takes.
2. **Auto-discovery is invisible.** When something breaks, the user can't see what data was extracted, why a field is missing, or why a route isn't matching. Debugging plugin magic is painful.

Inverting the design: an `og.config.ts` file keyed by `routeTree.gen.ts` paths, where each value is a function `({ params }) => OgData`. Explicit, typed, and routed by the same path strings TanStack Router already knows.

This is the same shape auvia uses today (a manifest plus a content-collections scan), but generalised, properly typed, and integrated with the route tree the user already maintains.

## Goals

- **One config file** the user writes (`src/og.config.ts`) — keys are the project's route paths, values are typed `(ctx) => OgData` functions.
- **One template file** the user writes (`src/og/template.tsx`) — design, dimensions, fonts.
- **One route mount** (`src/routes/og.$.png.ts`) — six lines, glues the config + template into a server handler.
- **One head spread** (`...ogMeta(ctx)`) in the root route.
- **Same code path in dev and prod.**
- **Cache-Control friendly** — content-hashed URLs + immutable headers offload everything to the CDN after the first hit.

The Vite plugin is **optional sugar** — it validates config keys against `routeTree.gen.ts`, supplies HMR, and (optionally) emits the route mount file so the user only writes two files instead of three.

## Non-goals

- **No default template.** Templates are a brand decision; any built-in default is wrong for everyone.
- **No build-time prerender.** Cache headers + CDN cover the perf story; revisit only if a real deployment forces it.
- **No fonts bundled.** Owned by the template module, not the library.
- **No browser-screenshot rendering** (Puppeteer/Playwright). Satori + Resvg is fast enough.
- **No automatic extraction from `head()`.** Explicit `og.config.ts` is the source of truth. (Opt-in `fromHead()` helper for sites where OG data really is just title + description.)
- **No SEO suite** (sitemaps, robots, etc.). Out of scope.

## Why runtime-only

Crawler timeouts are 5–30 s. A cold Satori + Resvg render of a non-pathological design is 50–250 ms. After the first hit, the CDN edge serves bytes — origin sees roughly one request per `(path, content-version)` tuple per CDN region.

Build-time prerender would save the first-hit latency at the cost of a much heavier system, longer builds, and stale images for any content edited between deploys. Wrong tradeoff for v1.

## Target user experience

### 1. Write the template (design lives here)

```tsx
// src/og/template.tsx
import { defineOgTemplate } from "@jxdltd/tanstack/og";
import InterRegular from "./fonts/Inter-Regular.ttf?arraybuffer";
import InterBold from "./fonts/Inter-Bold.ttf?arraybuffer";
import type { OgData } from "../og.config";

export default defineOgTemplate<OgData>({
  width: 1200,
  height: 630,
  fonts: [
    { name: "Inter", data: InterRegular, weight: 400 },
    { name: "Inter", data: InterBold, weight: 700 },
  ],
  render: ({ data, route }) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: 64,
        background: "#fff",
        fontFamily: "Inter",
      }}
    >
      <span style={{ fontSize: 24, color: "#888" }}>my-site.com</span>
      <h1 style={{ fontSize: 72, fontWeight: 700, marginTop: "auto" }}>{data.title}</h1>
      {data.description && <p style={{ fontSize: 28, color: "#555" }}>{data.description}</p>}
      {data.type === "article" && data.author && (
        <span style={{ fontSize: 22, color: "#888", marginTop: 16 }}>
          {data.author} · {data.date}
        </span>
      )}
    </div>
  ),
});
```

The template is parameterised on `OgData` — the shape `og.config.ts` returns. Fully typed `data` access in `render`, no casts.

### 2. Write the config (data per route lives here)

```ts
// src/og.config.ts
import { defineOgConfig } from "@jxdltd/tanstack/og";
import type { FileRoutesByPath } from "./routeTree.gen";
import { getPost } from "./lib/posts";

export type OgData = {
  title: string;
  description?: string;
  type?: "website" | "article";
  author?: string;
  date?: string;
  tag?: string;
};

export default defineOgConfig<OgData, FileRoutesByPath>({
  "/": () => ({ title: "my-site", description: "An opinionated dev blog." }),

  "/blog": () => ({ title: "Blog", description: "All posts." }),

  "/blog/$slug": async ({ params }) => {
    const post = await getPost(params.slug);
    return {
      title: post.title,
      description: post.excerpt,
      type: "article",
      author: post.author,
      date: post.date,
      tag: post.tag,
    };
  },

  "/privacy": () => ({ title: "Privacy", description: "How we handle data." }),
});
```

- `defineOgConfig<OgData, FileRoutesByPath>` constrains keys to **actual route paths from the generated route tree**. Typo a path → TypeScript error.
- Each function's `params` is **inferred from that route's path**: `/blog/$slug` gets `{ slug: string }` automatically.
- The function can do anything: hit a DB, read content-collections, derive from frontmatter, return a constant. The library never assumes how data is sourced.
- Missing routes fall through to an optional `default` entry (see "Defaults & sugar" below) or 404.

### 3. Mount the route

```ts
// src/routes/og.$.png.ts
import { createServerFileRoute } from "@tanstack/react-start/server";
import { createOgHandler } from "@jxdltd/tanstack/og/server";
import config from "../og.config";
import template from "../og/template";

export const ServerRoute = createServerFileRoute("/og/$").methods({
  GET: createOgHandler({ config, template }),
});
```

If the optional Vite plugin is installed, this file can be skipped — the plugin auto-emits an equivalent virtual route.

### 4. Wire the head meta

```tsx
// src/routes/__root.tsx
import { ogMeta } from "@jxdltd/tanstack/og/router";

export const Route = createRootRoute({
  head: (ctx) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width,initial-scale=1" },
      ...ogMeta(ctx, { siteName: "my-site", siteUrl: "https://my-site.com" }),
    ],
  }),
  component: RootComponent,
});
```

`ogMeta(ctx)` resolves the deepest matched route's path, runs the matching config function (cached for the request), and emits the canonical `og:*` / `twitter:*` set with `og:image` pointing at `/og/<path>.png?v=<hash>`. Per-route `head()` entries override individual fields naturally because TanStack Router dedupes meta by `name`/`property`.

Total user-facing surface: **one template, one config, one route mount, one head spread.** (Three files if the plugin is enabled.)

## Architecture

```
Crawler / browser
   │  GET /og/blog/foo.png?v=<contentHash>
   ▼
Server route handler (createOgHandler)
   1. parse URL → route + params via TanStack Router matcher
   2. look up config["/blog/$slug"] (no SSR module imports needed)
   3. await config["/blog/$slug"]({ params: { slug: "foo" } }) → OgData
   4. call template.render({ data, route })
   5. satori → SVG → resvg → PNG
   6. respond
   ▼
HTTP response
   Content-Type: image/png
   Cache-Control: public, max-age=31536000, immutable
   ETag: "<contentHash>"
```

`?v=<contentHash>` is computed by `ogMeta(ctx)` at SSR time as `sha256(JSON.stringify(ogData) + templateVersion)` — deterministic, so URLs are stable across deploys for unchanged content and rotate automatically when anything changes.

```
SSR render of /blog/foo
   ogMeta(ctx) inspects ctx.matches → matched route is /blog/$slug
   calls config["/blog/$slug"]({ params: { slug: "foo" } }) → ogData
   computes hash = sha256(ogData + templateVersion)
   emits <meta property="og:image" content="https://my-site.com/og/blog/foo.png?v=<hash>">
```

When the post is edited, the template is changed, or the site is redeployed with new template source, the hash flips, the URL flips, the CDN treats it as a new resource, crawlers refetch.

## Components

### 1. `og.config.ts`

```ts
type OgConfigEntry<TData, TParams> = (ctx: {
  params: TParams;
  request: Request;
}) => TData | Promise<TData>;

type OgConfig<TData, TRoutes extends Record<string, { params: any }>> = {
  [P in keyof TRoutes]?: OgConfigEntry<TData, TRoutes[P]["params"]>;
} & {
  default?: OgConfigEntry<TData, Record<string, string>>;
};

declare function defineOgConfig<TData, TRoutes>(
  config: OgConfig<TData, TRoutes>,
): OgConfig<TData, TRoutes>;
```

- Keys constrained to TanStack Router's `FileRoutesByPath` type → typo-safe.
- Per-route `params` typed from the route definition.
- `default` entry fires for any matched route without an explicit config.
- Functions may be async and may read from any source the project already uses (loaders, content-collections, DB, fetch).

### 2. `og/template.tsx`

```ts
type OgTemplateContext<TData> = {
  data: TData;
  route: { path: string; fullPath: string; params: Record<string, string> };
  request: Request;
};

type OgTemplateModule<TData> = {
  width: number;
  height: number;
  fonts: Array<{
    name: string;
    data: ArrayBuffer | Buffer | Uint8Array;
    weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
    style?: "normal" | "italic";
  }>;
  render: (ctx: OgTemplateContext<TData>) => React.ReactNode | Promise<React.ReactNode>;
};

declare function defineOgTemplate<TData>(spec: OgTemplateModule<TData>): OgTemplateModule<TData>;
```

Multiple designs? Branch inside `render` on `route.path` or a discriminator field on `data` (e.g. `data.type`). No registry API.

### 3. `createOgHandler({ config, template })`

The runtime helper. Pseudocode:

```ts
export function createOgHandler({ config, template }) {
  const lru = createLRU({ max: 256 });

  return async ({ request }) => {
    const path = parseOgPath(request.url); // strip /og/ prefix and .png suffix
    const match = matchRoute(path); // TanStack Router matcher
    if (!match) return new Response(null, { status: 404 });

    const entry = config[match.routePath] ?? config.default;
    if (!entry) return new Response(null, { status: 404 });

    const data = await entry({ params: match.params, request });
    const hash = sha256(JSON.stringify(data) + TEMPLATE_VERSION);

    const cached = lru.get(hash);
    if (cached) return pngResponse(cached, hash);

    const inflight = lru.inflight(hash);
    if (inflight) return pngResponse(await inflight, hash);

    const png = await lru.race(hash, async () => {
      const node = await template.render({ data, route: match, request });
      const svg = await satori(node, {
        width: template.width,
        height: template.height,
        fonts: template.fonts,
      });
      return Buffer.from(new Resvg(svg).render().asPng());
    });

    return pngResponse(png, hash);
  };
}
```

Headers on `pngResponse`: `Content-Type: image/png`, `Cache-Control: public, max-age=31536000, immutable`, `ETag: "<hash>"`.

### 4. `ogMeta(ctx, options?)`

```ts
declare function ogMeta(
  ctx: HeadContext,
  options?: { siteName?: string; siteUrl?: string; twitterHandle?: string },
): Promise<MetaEntry[]>;
```

Reads `ctx.matches`, calls the relevant config entry to get `OgData`, and emits the full `og:*` / `twitter:*` set. The image URL is `<siteUrl>/og/<matchedPath>.png?v=<hash>` where the hash is the same digest the handler will compute, so URLs match.

`siteUrl` resolution: explicit option → `VITE_SITE_URL` → `SITE_URL` → relative URL (with a one-time warning).

To avoid double-fetching, `ogMeta` and the route loader can share a request-scoped memoization (Nitro's `useStorage` per-request, or a simple `WeakMap<Request, Map<routePath, OgData>>`). For most sites, calling the config function twice (once for meta, once for image) is fine; for expensive fetches the user can memoise inside their config function.

### 5. Defaults & sugar

```ts
import { fromHead } from "@jxdltd/tanstack/og";

defineOgConfig({
  default: fromHead(), // derive { title, description } from each route's head()
  "/blog/$slug": async ({ params }) => {
    /* override per route */
  },
});
```

`fromHead()` is opt-in convenience for sites where most routes only need the page title/description. It re-implements the "scrape from head's meta array" behaviour from the earlier draft, but as an explicit default function the user invokes — not as plugin-level magic.

### 6. The optional Vite plugin

```ts
// vite.config.ts
plugins: [tanstackStart(), og(), viteReact(), nitro()];
```

Responsibilities (small):

| Hook                    | Responsibility                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `configResolved`        | Resolve `configPath` and `templatePath`; capture `siteName` / `siteUrl` for `ogMeta`.                                                 |
| `buildStart`            | **Validate config keys** against `routeTree.gen.ts` — error early on typos or stale paths. This is the main reason to use the plugin. |
| `resolveId` + `load`    | Serve `virtual:tanstack-og/config-binding` — the route-tree path → handler binding used by `ogMeta`.                                  |
| Optional route emission | Emit the server route file virtually, so the user can skip writing `src/routes/og.$.png.ts`.                                          |
| `configureServer`       | Dev middleware mounted at the same path; uses Vite's SSR runner so config + template edits hot-reload.                                |
| `handleHotUpdate`       | Invalidate dev LRU on config / template changes.                                                                                      |

Without the plugin, everything still works — the user writes the route mount themselves and loses the typo validation + dev HMR.

### 7. Caching

**HTTP / CDN.**

- `Cache-Control: public, max-age=31536000, immutable` — safe because URLs are content-addressed via `?v=<hash>`.
- `ETag: "<contentHash>"` for conditional revalidation.
- After warmup, origin sees ~one request per `(path, hash)` per CDN region.

**Origin LRU.**

- In-memory `Map<hash, Buffer>`, default cap 256 entries (~50–80 MB at 1200×630).
- In-flight dedupe — concurrent requests for the same hash await one render.
- Optional Nitro `useStorage` write-through for persistent cross-cold-start cache.

### 8. Workers / non-Node targets

`@resvg/resvg-js` is native. For Cloudflare Workers / Deno Deploy, the handler swaps in `@resvg/resvg-wasm` based on the Nitro target adapter (auto-detected from `tanstackStart()` / `nitro()` config, or explicit via `renderer: "wasm"`).

## Configuration API

```ts
type OgPluginOptions = {
  configPath?: string; // default: src/og.config.{ts,tsx,js,jsx}
  templatePath?: string; // default: src/og/template.{tsx,ts,jsx}
  routePath?: string; // default: "/og"

  // Defaults consumed by ogMeta when no per-call options are passed.
  siteName?: string;
  siteUrl?: string;
  twitterHandle?: string;

  cache?: {
    lru?: number | false; // default 256
    persist?: boolean; // default false
  };

  renderer?: "auto" | "node" | "wasm"; // default "auto"
  emitRoute?: boolean; // default true — auto-emit src/routes/og.$.png.ts
};
```

No `fonts` (template owns them). No `width`/`height` (template owns them). No `routes.*` filters (the config is the route list).

## Build flow

```
vite build
  ├─ TanStack Router plugin generates routeTree.gen.ts
  ├─ og() plugin (optional) validates config keys against the route tree
  ├─ Vite client + SSR builds run normally
  └─ Nitro packages .output/

No worker pool, no PNG emission step, no asset manifest. Build-time impact: ~zero.
```

## Dev flow

```
vite dev
  └─ og() configureServer (or the user's mounted route, in plugin-less mode)
       middleware: GET <routePath>/<path>.png
         → match against current route tree
         → look up config entry
         → run config({ params }) → OgData
         → template.render → satori → resvg → PNG
       handleHotUpdate
         → invalidate LRU entries touching changed config/template module
```

## Edge cases & gotchas

| Issue                                                  | Resolution                                                                                                                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Drift between page meta and OG image**               | They're separate by design; both source from the same lib (`getPost`, content-collection, etc.) when consistency matters. `fromHead()` covers the "they're identical" case.    |
| **Double-fetching (loader + config)**                  | Memoise inside the user's data lib; or use `fromHead()` if the loader already returns the right shape.                                                                         |
| **First-render cold latency**                          | Acceptable (50–250 ms ≪ crawler timeouts); CDN absorbs the rest.                                                                                                               |
| **Cache busting on content edit**                      | URL hash includes `OgData` JSON. Edit → new hash → new URL → fresh resource.                                                                                                   |
| **Cache busting on template edit**                     | Template source hash is folded into the URL hash via the virtual config module. Deploy rotates every URL.                                                                      |
| **Crawlers stripping query strings**                   | Path is stable (`/og/blog/foo.png`); they get the right image but stale until content path changes. Acceptable. Optional `<hash>`-in-path encoding: `/og/blog/foo.<hash>.png`. |
| **Workers / wasm runtime**                             | `renderer: "auto"` swaps in `@resvg/resvg-wasm` for Worker-class adapters.                                                                                                     |
| **Failed render (template throws / bad font)**         | Log structured error; respond `500` with a 1×1 transparent PNG so the page's `og:image` doesn't 404 in social validators.                                                      |
| **Concurrent identical requests**                      | In-flight dedupe via promise map keyed on hash.                                                                                                                                |
| **Missing config / template**                          | Library throws at startup pointing at the expected path.                                                                                                                       |
| **Stale config keys (route renamed in routeTree.gen)** | Plugin's `buildStart` validation errors at build time. Without the plugin, the handler returns 404 for unmatched paths.                                                        |
| **`siteUrl` missing**                                  | `og:image` becomes relative; build-time warning.                                                                                                                               |
| **CJK / multi-script titles**                          | Template owns fonts → user adds NotoSans CJK as needed.                                                                                                                        |

## Comparison to alternatives

| Approach                                                | Tradeoff                                                                                                                                                               |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hand-rolled per project (auvia today)**               | No abstraction; each project re-wires routing, caching, head injection.                                                                                                |
| **`head()` + `loader` auto-extraction (earlier draft)** | Looks magical; in practice templates need fields beyond `head()`, so users hit `loaderData: unknown` casts and cross-route data shape mismatches. Debugging is opaque. |
| **Build-time prerender**                                | Faster first hit at the cost of heavy plugin code, longer builds, stale on content edits, manifest tracking. Defer until a real deployment requires it.                |
| **`@vercel/og` standalone**                             | Same render core; not TanStack-Start-aware; no route-tree-typed config.                                                                                                |
| **Browser-screenshot (Puppeteer / `remix-og-image`)**   | Higher fidelity for arbitrary CSS; orders of magnitude slower; CI-hostile.                                                                                             |

## Phased implementation

### Phase 1 — Library MVP

- [ ] `defineOgConfig<TData, TRoutes>` typed identity helper.
- [ ] `defineOgTemplate<TData>` typed identity helper.
- [ ] `createOgHandler({ config, template })` runtime.
- [ ] TanStack Router path matcher integration (or a tiny static path-matcher we ship).
- [ ] `ogMeta(ctx, options?)` helper.
- [ ] In-memory LRU + in-flight dedupe.
- [ ] `fromHead()` opt-in default.

**Exit criteria.** With `og.config.ts`, `og/template.tsx`, a six-line `og.$.png.ts` route mount, and `...ogMeta(ctx)` in `__root.tsx`, OG images render correctly in dev and prod across static and dynamic routes — no Vite plugin needed.

### Phase 2 — Optional Vite plugin

- [ ] `og()` plugin scaffold.
- [ ] `buildStart` validation: every config key matches a real route in `routeTree.gen.ts`; warn on routes lacking config and no `default`.
- [ ] Auto-emit the server route mount (skip phase-1's manual file).
- [ ] `configureServer` dev middleware + HMR integration.
- [ ] Virtual `tanstack-og/config` module to wire `siteName` / `siteUrl` from plugin options.

**Exit criteria.** Adding `og()` to `vite.config.ts` removes the manual route mount, catches stale config keys at build time, and hot-reloads on template/config edits.

### Phase 3 — Runtime hardening

- [ ] `@resvg/resvg-wasm` fallback auto-selected from Nitro adapter.
- [ ] Nitro `useStorage` persistent cache.
- [ ] Failure-path 1×1 PNG with structured logs.
- [ ] `npx tanstack-og warm <baseUrl>`: walk sitemap, pre-ping each `og:image` so the first crawler hit is hot after deploys.

### Phase 4 — Optional build-time prerender

If real deployments require it (static-only hosts, very latency-sensitive crawlers), add `prerender: true` mode that walks the route tree at `closeBundle` and emits PNGs for static-discoverable paths. Reuses the same config + template + handler. Disabled by default.

### Phase 5 — DX

- [ ] `npx tanstack-og preview /blog/foo` opens a live preview against the dev server.
- [ ] Solid Start support.

## Open questions

1. **Param typing from `routeTree.gen.ts`.** TanStack Router exposes `FileRoutesByPath`; confirm the per-route `params` type is reachable via that index, including for catch-all (`$`) and pathless layouts. If not, ship a small `RouteParams<P>` helper.
2. **Server-route emission API.** What's the supported way to inject a server file route from a Vite plugin? Options: write a real source file at install time, virtual route module via `@tanstack/router-plugin`, or document the one-line user re-export. (The plan currently allows all three; favour virtual if the plugin API supports it cleanly.)
3. **Hash inputs.** Default to `sha256(JSON.stringify(ogData) + templateVersion)`. Edge case: `ogData` containing functions or non-serialisable values. Document that config functions must return JSON-serialisable data.
4. **Request-scoped memoisation between `ogMeta` and the handler.** Worth shipping a `requestCache` helper that wraps a config entry and dedupes within a single request? Or leave it to the user's data lib? Lean toward latter for simplicity.
5. **Bare Nitro `eventHandler` vs. `createServerFileRoute`.** Detect at runtime and pick automatically based on the host project's TanStack Start version.

## TL;DR

Two user files (config + template), one tiny route mount, one head spread. The config is keyed by typed route paths, returns explicit `OgData`, and is the only data source the template ever sees — no `loaderData: unknown`, no head-array scraping, no plugin magic. Cache-Control + CDN handles the rest. The Vite plugin is optional sugar that catches stale config keys and provides HMR.
