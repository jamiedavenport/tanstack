# `@jxdltd/tanstack/og` — Design plan

A Vite plugin that ships a single OG-image API route for any TanStack Start site. Cache-Control headers and a CDN make it perform like a static asset — without the build-pipeline machinery.

> **Companion:** [`og-current.md`](./og-current.md) describes how `auvia.io` does this today (build-time PNGs, manual manifest, fixed dimensions). This plan generalises and simplifies it.

## Goals

- **One plugin entry** in `vite.config.ts`.
- **One template file** the user writes (`src/og/template.tsx`).
- **One spread** (`...ogMeta(ctx)`) in the root route's `head()`.
- **Single code path in dev and prod.** The same handler renders the image whether you're running `vite dev` or hitting `.output/server/index.mjs`.
- **`head()` + `loader` are the source of truth** for title / description. The plugin never asks the user to repeat metadata.
- **Cache-Control friendly** — content-hashed URLs + immutable headers offload everything to the CDN after the first hit.

## Non-goals

- **No default template.** The plugin never picks a design. Templates are a brand decision; any built-in default would be wrong for everyone. Users write their own template (one file, ~30 lines), and that's where typography, colours, fonts, and layout live.
- **No build-time prerender.** Cache headers + CDN cover the perf story; revisit only if a real deployment forces it.
- **No fonts bundled.** Owned by the template module, not the plugin.
- **No browser-screenshot rendering** (Puppeteer/Playwright). Satori + Resvg is fast enough.
- **No SEO suite** (sitemaps, robots, etc.). Out of scope.

## Why runtime-only

Crawler timeouts are 5–30 s. A cold Satori + Resvg render of a non-pathological design is 50–250 ms. After the first hit, the CDN edge serves bytes — origin sees roughly one request per `(path, content-version)` tuple per CDN region.

Build-time prerender would save the first-hit latency at the cost of a much heavier plugin, longer builds, and stale images for any content edited between deploys. Wrong tradeoff for v1.

## Target user experience

### 1. Install

```ts
// vite.config.ts
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { og } from "@jxdltd/tanstack/og";

export default defineConfig({
  plugins: [tanstackStart(), og(), viteReact(), nitro()],
});
```

### 2. Write a template (this is where design lives)

```tsx
// src/og/template.tsx
import { defineOgTemplate } from "@jxdltd/tanstack/og";
import InterRegular from "./fonts/Inter-Regular.ttf?arraybuffer";
import InterBold from "./fonts/Inter-Bold.ttf?arraybuffer";

export default defineOgTemplate({
  width: 1200,
  height: 630,
  fonts: [
    { name: "Inter", data: InterRegular, weight: 400 },
    { name: "Inter", data: InterBold, weight: 700 },
  ],
  render: ({ head, loaderData, route, staticData }) => (
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
      <h1 style={{ fontSize: 72, fontWeight: 700, marginTop: "auto" }}>{head.title}</h1>
      {head.description && <p style={{ fontSize: 28, color: "#555" }}>{head.description}</p>}
    </div>
  ),
});
```

`defineOgTemplate(spec)` is a typed identity helper — exists purely for IntelliSense over `render`'s context. The template module owns dimensions, fonts, and JSX. The plugin never imposes any of those.

For sites that need multiple designs (post card vs. landing card vs. doc page), branch inside `render` on `route.path` or `staticData.og.template`. We deliberately don't ship a registry API — branching inside one render function is one less concept to learn.

### 3. Wire the head meta

```tsx
// src/routes/__root.tsx
import { ogMeta } from "@jxdltd/tanstack/og/router";

export const Route = createRootRoute({
  head: (ctx) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width,initial-scale=1" },
      ...ogMeta(ctx),
    ],
  }),
  component: RootComponent,
});
```

`ogMeta(ctx)` reads from `ctx.matches` and emits the canonical `og:*` and `twitter:*` set, with the `og:image` URL pointing at the generated server route. Per-route `head()` entries override individual fields naturally because TanStack Router dedupes meta by `name`/`property`.

That is the entire user-facing surface: **one plugin entry, one template file, one head spread.**

## Architecture

```
Crawler / browser
   │  GET /og/blog/foo.png?v=<contentHash>
   ▼
Server route (emitted by og() plugin)
   1. parse path → route + params via TanStack Router matcher
   2. import the matched route module from the SSR runtime
   3. run loader(params) → head({ params, loaderData })
   4. extract { title, description, image } from head's meta
   5. call userTemplate.render({ route, head, loaderData, staticData })
   6. satori → SVG → resvg → PNG
   7. respond
   ▼
HTTP response
   Content-Type: image/png
   Cache-Control: public, max-age=31536000, immutable
   ETag: "<contentHash>"
```

`?v=<contentHash>` is computed by `ogMeta(ctx)` at SSR render time — same inputs (head + loaderData digest + template version) produce the same hash, so URLs are stable across deploys for unchanged content and rotate automatically when anything changes.

```
SSR render of /blog/foo
   ogMeta(ctx) inspects ctx.matches → matched route is /blog/$slug
   computes hash = sha256(headMeta + loaderDataDigest + templateVersion)
   emits <meta property="og:image" content="https://my-site.com/og/blog/foo.png?v=<hash>">
```

When the post is edited, the template is changed, or the site is redeployed with new template source, the hash flips, the URL flips, the CDN treats it as a new resource, crawlers refetch. No manual cache busting.

## Components

### 1. The Vite plugin

Small. Most of its job is wiring; the actual render lives in a runtime helper.

| Hook                  | Responsibility                                                                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `configResolved`      | Resolve `templatePath` (default `src/og/template.{tsx,ts,jsx}`); capture `siteName`, `siteUrl`, `routePath`; detect Nitro target for renderer selection. |
| `resolveId` + `load`  | Serve `virtual:tanstack-og/template` (re-exports the user's template) and `virtual:tanstack-og/config` (consumed by `ogMeta`).                           |
| Server route emission | Inject a TanStack Start server route at `<routePath>/$.png` pointing at the runtime handler. (See "Open questions" for the mechanism.)                   |
| `configureServer`     | Dev middleware that short-circuits the same path and uses Vite's SSR runner — same code path as prod, instantly reflecting template/route edits.         |
| `handleHotUpdate`     | Invalidate the in-memory LRU when the template or any matched route module changes.                                                                      |

### 2. User template module

Required. The plugin fails fast at startup if it can't find one — no fallback renderer.

```ts
type OgTemplateModule = {
  width: number;
  height: number;
  fonts: Array<{
    name: string;
    data: ArrayBuffer | Buffer | Uint8Array;
    weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
    style?: "normal" | "italic";
  }>;
  render: (ctx: OgRenderContext) => React.ReactNode | Promise<React.ReactNode>;
};

type OgRenderContext = {
  route: { path: string; fullPath: string; params: Record<string, string> };
  head: { title?: string; description?: string; image?: string };
  loaderData: unknown;
  staticData: Record<string, unknown>;
};
```

`defineOgTemplate(spec)` returns the spec unchanged; it exists so editors infer the `render` context.

### 3. Server route handler

Generated by the plugin (or — fallback — re-exported by the user from a one-line route file). Pseudo-source:

```ts
import template from "virtual:tanstack-og/template";
import { handleOgRequest } from "@jxdltd/tanstack/og/server";

export const ServerRoute = createServerFileRoute("/og/$").methods({
  GET: ({ request }) => handleOgRequest(request, template),
});
```

`handleOgRequest`:

1. Strip the configured `routePath` prefix and `.png` suffix → candidate route path.
2. Resolve to a matched route via TanStack Router's matcher; 404 on miss.
3. Import the matched route module from the SSR build (prod) or via Vite's SSR runner (dev).
4. Run `loader` and `head` to get `loaderData` and the merged head object.
5. Extract `{ title, description, image }` from the head's `meta` array (mirrors `ogMeta`'s extraction logic).
6. Call `template.render({ ... })`.
7. Satori → SVG → Resvg → PNG.
8. Respond with `Cache-Control: public, max-age=31536000, immutable` and an `ETag` set to the content hash.

### 4. Meta injection helper (`ogMeta`)

```ts
export function ogMeta(
  ctx: HeadContext,
  options?: {
    siteName?: string;
    siteUrl?: string;
    twitterHandle?: string;
  },
): MetaEntry[];
```

Reads `ctx.matches` for the deepest matched route's path, the existing `title` / `description` already on the head, and `staticData.og` for type/published-time hints. Emits:

- `og:type` (`website` | `article` from `staticData.og.type`)
- `og:site_name`, `og:title`, `og:description`, `og:url`
- `og:image`, `og:image:alt`, `og:image:width`, `og:image:height`
- `twitter:card` = `summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`
- `article:published_time` when applicable
- `link rel=canonical`

Image URL: `<siteUrl><routePath>/<matchedPath>.png?v=<hash>`. Hash is `sha256(JSON.stringify({ headMeta, loaderDataDigest, templateVersion }))`, computed during SSR — cheap, deterministic.

`siteUrl` resolves: explicit option → `VITE_SITE_URL` → `SITE_URL` → relative URL (with a one-time warning, since most crawlers require absolute URLs).

### 5. Caching strategy

This is the load-bearing claim of the runtime-only design.

**HTTP / CDN.**

- `Cache-Control: public, max-age=31536000, immutable` — safe because the URL is content-addressed via `?v=<hash>`.
- `ETag: "<contentHash>"` for conditional revalidation.
- Standard CDNs (Cloudflare, Fastly, Vercel, Netlify) coalesce origin traffic to ~1 request per `(path, hash)` per region. After warmup, origin load tends to zero until content changes.

**Origin LRU.**

- In-memory `Map<hashKey, Buffer>` capped at e.g. 256 entries (~50–80 MB for 1200×630 PNGs).
- In-flight dedupe — concurrent requests for the same hash await a single render promise.
- Optional Nitro `useStorage` write-through for persistent cache between cold starts.

### 6. Dev mode

`configureServer` middleware mounts at the same path as the production route and reuses the same handler via Vite's SSR runner. Editing the template, a route's loader, or its head triggers an HMR signal that invalidates affected LRU entries; the next request re-renders. No separate dev pipeline, no surprises in prod.

### 7. Workers / non-Node targets

`@resvg/resvg-js` is a native Node module. For Cloudflare Workers / Deno Deploy:

- The plugin reads the Nitro target adapter from `tanstackStart()` / `nitro()` config at `configResolved`.
- For Worker-class targets, it swaps in `@resvg/resvg-wasm` at runtime. Template authors don't think about it.

## Configuration API

```ts
type OgOptions = {
  // Where to find the user's template module.
  templatePath?: string; // default: src/og/template.tsx (also tries .ts / .jsx)

  // Public mount path for the server route.
  routePath?: string; // default: "/og"

  // Site metadata used by ogMeta defaults (per-call options override).
  siteName?: string;
  siteUrl?: string;
  twitterHandle?: string;

  // Runtime caching tuning.
  cache?: {
    lru?: number | false; // default 256 entries; false disables
    persist?: boolean; // default false; uses Nitro storage when true
  };

  // Force a renderer; default auto-selects based on Nitro target.
  renderer?: "auto" | "node" | "wasm";
};
```

That is the entire surface. No `fonts` (template owns them). No `width`/`height` (template owns them). No `routes.*` filters (the route is matched on demand from the actual route tree). No `template` option (path is the only knob; the file owns design).

## Build flow

```
vite build
  ├─ TanStack Router plugin generates routeTree.gen.ts
  ├─ og() emits the server route and virtual modules into the SSR build
  ├─ Vite client + SSR builds run normally
  └─ Nitro packages .output/

No og worker pool, no PNG emission step, no asset manifest. Build-time impact: ~0.
```

## Dev flow

```
vite dev
  └─ og() configureServer
       middleware: GET <routePath>/<path>.png
         → match against current route tree
         → SSR-import route module + template via Vite runner
         → run loader → head → template.render
         → satori → resvg → PNG
       handleHotUpdate
         → invalidate LRU entries touching changed module
```

## Edge cases & gotchas

| Issue                                          | Resolution                                                                                                                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **First-render cold latency**                  | Acceptable (50–250 ms ≪ crawler timeouts); CDN absorbs everything else.                                                                                                               |
| **Cache busting on content edit**              | URL contains `?v=<hash>` derived from head + loaderData. Edit → new hash → new URL → fresh resource.                                                                                  |
| **Cache busting on template edit**             | Template source hash is folded into the same digest at build time via the virtual config module. Deploying a template change rotates every URL.                                       |
| **Crawlers stripping query strings**           | Path is stable (`/og/blog/foo.png`); they get the right image but stale until path changes. Acceptable. Optional path-encoded variant: `/og/blog/foo.<hash>.png` for paranoid setups. |
| **Workers / wasm runtime**                     | `renderer: "auto"` swaps in `@resvg/resvg-wasm` for Worker-class Nitro adapters.                                                                                                      |
| **Failed render (template throws / bad font)** | Log structured error; respond `500` with a 1×1 transparent PNG so the page's `og:image` doesn't 404 and break shares.                                                                 |
| **Concurrent identical requests**              | In-flight dedupe via promise map keyed on hash.                                                                                                                                       |
| **Missing template**                           | Plugin throws at startup pointing at the expected path. No fallback rendering.                                                                                                        |
| **`siteUrl` missing**                          | `og:image` becomes relative; build-time warning.                                                                                                                                      |
| **SPA mode**                                   | Server route still works (Nitro is still in the build); behaviour identical.                                                                                                          |
| **CJK / multi-script titles**                  | Template owns fonts → user adds NotoSans CJK if they need it. Not the plugin's problem.                                                                                               |

## Comparison to alternatives

| Approach                                              | Tradeoff                                                                                                                          |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Hand-rolled per project (auvia today)**             | No abstraction; each project re-wires routing, caching, head injection.                                                           |
| **Build-time prerender (earlier draft of this plan)** | Faster first hit at the cost of heavy plugin code, longer builds, stale images on content edits, manifest tracking. Not worth it. |
| **`@vercel/og` standalone**                           | Same render core; not TanStack-Start-aware, no head/loader integration, no dev middleware.                                        |
| **Browser-screenshot (Puppeteer / `remix-og-image`)** | Higher fidelity for arbitrary CSS; orders of magnitude slower; CI-hostile.                                                        |

## Phased implementation

### Phase 1 — Runtime MVP

- [ ] Plugin scaffold + options parsing.
- [ ] Virtual modules: `virtual:tanstack-og/template`, `virtual:tanstack-og/config`.
- [ ] Server route emission into the TanStack Start route tree.
- [ ] `handleOgRequest` runtime helper (route match → loader → head → satori → resvg → cache headers).
- [ ] `ogMeta(ctx, options?)` helper.
- [ ] `defineOgTemplate(spec)` typed identity helper.
- [ ] `configureServer` dev middleware using Vite SSR runner.
- [ ] In-memory LRU + in-flight dedupe.

**Exit criteria.** Adding `og()`, writing `src/og/template.tsx`, and spreading `...ogMeta(ctx)` once in `__root.tsx` produces working OG images for every route in dev and prod, with no other configuration.

### Phase 2 — Runtime hardening

- [ ] `@resvg/resvg-wasm` fallback for Workers / Deno targets, auto-selected from the Nitro adapter.
- [ ] Nitro `useStorage` persistent cache.
- [ ] Failure-path 1×1 PNG with structured logs.
- [ ] `npx tanstack-og warm <baseUrl>` — walks sitemap and pre-pings each `og:image` so the first crawler hit is hot after deploys.

### Phase 3 — Optional build-time prerender

If real-world deployments require it (static-only hosts, very latency-sensitive crawlers), add an opt-in `prerender: true` mode that walks the route tree at `closeBundle` and emits PNGs alongside the static client output. Reuses the same template + handler — just runs them at build time. **Disabled by default.**

### Phase 4 — DX polish

- [ ] `npx tanstack-og preview /blog/foo` opens a live preview against the dev server.
- [ ] Solid Start support (parameterise `head()` invocation).
- [ ] Per-type templates by branching convention (documented; no new API).

## Open questions

1. **Server-route emission API.** What's the supported way to inject a server file route into TanStack Start's tree from a Vite plugin? Options: (a) write a real source file under `src/routes/__og.$.png.ts` at install time; (b) virtual route module via `@tanstack/router-plugin`; (c) document a one-line user re-export. (b) is cleanest if the plugin API supports it; (c) is the no-magic fallback.
2. **Hash inputs.** Should the URL hash digest use full `loaderData` (safe, may churn) or only `title` / `description` / `image` / a user-provided `versionFor(loaderData)` hook? Default to head meta + optional hook.
3. **Dynamic font swapping.** Templates declare fonts statically. If a template wants per-render fonts (locale-dependent), allow `render` to optionally return `{ jsx, fonts }`. Defer until requested.
4. **`loaderData` typing.** Per-route types can't be inferred generically. Provide `defineOgTemplate<TLoaderData>()` and document a `staticData.og.loaderData satisfies T` pattern for typed branches.
5. **Nitro vs. Start route shape.** Bare Nitro `eventHandler` is portable across Start versions; `createServerFileRoute` is more idiomatic. Detect at build and pick automatically.

## TL;DR

One server route. User-written template. Cache-Control headers do the rest. The plugin's job is to wire TanStack Start's `head()` and route tree to a single Satori + Resvg handler — not to orchestrate a build pipeline or impose a default design.
