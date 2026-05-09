# @jxdltd/tanstack

Helpers for [TanStack Start](https://tanstack.com/start) projects.

The package is split into subpath entrypoints. The first one shipped is **`/og`** — a typed, runtime, per-route OG image system that drops into any TanStack Start app:

- **One config file** keyed by your typed route paths from `routeTree.gen.ts`.
- **One template file** for design + dimensions + fonts.
- **One server route** at `/og/$` that renders PNGs via [Satori](https://github.com/vercel/satori) + [Resvg](https://github.com/yisibl/resvg-js).
- **One head spread** in each route that should expose an `og:image`.

```bash
pnpm add @jxdltd/tanstack
```

## Quick start

### 1. `og/config.ts` — your data, keyed by route paths

```ts
// src/og/config.ts
import { defineOgConfig, ignore } from "@jxdltd/tanstack/og";
import { allPosts } from "content-collections";

export default defineOgConfig({
  "/": () => ({
    title: "My site",
    description: "An opinionated dev blog.",
    type: "website",
  }),

  "/blog/": () => ({
    title: "Blog",
    description: "All posts.",
    type: "website",
  }),

  "/blog/$slug": ({ params }) => {
    const post = allPosts.find((p) => p.slug === params.slug);
    if (!post) return ignore;
    return {
      title: post.title,
      description: post.excerpt,
      type: "article",
      author: post.author,
      date: post.date,
      tag: post.tag,
    };
  },

  "/og/$": () => ignore,
});
```

Keys are constrained to your project's `FileRoutesByPath` (which TanStack Router augments via `routeTree.gen.ts`). Every known route is **required** in the config — omitting one is a TypeScript error. Use `ignore` (returned from the entry function) when a route shouldn't expose an OG card.

`params` is typed per-key from the path: `/blog/$slug` gets `{ slug: string }`, `/files/$` gets `{ _splat: string }`, `/` gets `Record<string, never>`.

### 2. `og/template.tsx` — design, dimensions, fonts

```tsx
// src/og/template.tsx
import { defineOgTemplate, type OgTemplateFont } from "@jxdltd/tanstack/og";
import GeistRegular from "geist/dist/fonts/geist-sans/Geist-Regular.ttf?inline";
import GeistMedium from "geist/dist/fonts/geist-sans/Geist-Medium.ttf?inline";

const decode = (dataUrl: string) => Buffer.from(dataUrl.split(",")[1], "base64");

const fonts: OgTemplateFont[] = [
  { name: "Geist", data: decode(GeistRegular), weight: 400, style: "normal" },
  { name: "Geist", data: decode(GeistMedium), weight: 500, style: "normal" },
];

export default defineOgTemplate({
  width: 1200,
  height: 630,
  fonts,
  render: ({ data }) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: 64,
        fontFamily: "Geist",
        background: "#fff",
      }}
    >
      <h1 style={{ fontSize: 72, fontWeight: 700, marginTop: "auto" }}>{data.title}</h1>
      {data.description ? <p style={{ fontSize: 28, color: "#555" }}>{data.description}</p> : null}
    </div>
  ),
});
```

Importing fonts with Vite's `?inline` suffix bundles them into the build as base64 data URLs, so the template works in any runtime (Node, edge, serverless) without `node:fs` reads or `process.cwd()` path resolution. `fonts` accepts either an array (eager) or a function returning an array (lazy) — the lazy form runs once on the first request and the result is reused, useful if you'd rather defer decoding.

### 3. `routes/og/$.ts` — the server route

```ts
// src/routes/og/$.ts
import { createFileRoute } from "@tanstack/react-router";
import { createOgHandler } from "@jxdltd/tanstack/og/server";
import config from "../../og/config";
import template from "../../og/template";

const handler = createOgHandler({ config, template });

export const Route = createFileRoute("/og/$")({
  server: {
    handlers: {
      GET: ({ request }) => handler({ request }),
    },
  },
});
```

The handler:

- Strips the `/og/` prefix and optional `.png` suffix from the URL.
- Matches the remaining path against your config keys. Static keys, named params (`$slug`), and splat (`$`) all work.
- Calls the matched entry; a return of `ignore` produces a `404`.
- Renders via Satori → Resvg.
- Responds `Content-Type: image/png`, `Cache-Control: public, max-age=31536000, immutable`, and an `ETag` derived from the rendered data.
- Caches PNGs in-process and dedupes concurrent identical requests.

### 4. `__root.tsx` (or per-route) — the head spread

```tsx
// inside any route's head()
import { ogMeta } from "@jxdltd/tanstack/og/router";

export const Route = createFileRoute("/blog/$slug")({
  head: (ctx) => ({
    meta: [
      // ... your existing title, description, etc.
      ...ogMeta(ctx, { siteName: "My site", siteUrl: "https://example.com" }),
    ],
  }),
});
```

`ogMeta(ctx, options?)` reads the route's `match.fullPath` and `params` (or the deepest entry of `matches[]`), substitutes splat params, and emits:

- `og:image`, `og:image:width`, `og:image:height`
- `twitter:card` (`summary_large_image`), `twitter:image`
- `og:image:alt` (when `siteName` is provided)
- `twitter:site` (when `twitterHandle` is provided)

The image URL is `<siteUrl>/og/<resolved-path>.png` (or relative when `siteUrl` is omitted, with a build-time warning if you wire one up).

## API reference

### `@jxdltd/tanstack/og`

#### `defineOgConfig(config)`

Identity helper. Constrains keys to `FileRoutesByPath` and types each entry's `params` from its path key. Returns the input.

#### `defineOgTemplate(template)`

Identity helper for the template module. Returns the input.

#### `ignore`

A unique symbol you return from a config entry to mean "this route shouldn't have an OG card." The handler returns `404` when an entry returns it; `ogMeta` doesn't inspect this (it just builds a URL — it's the handler that knows whether the URL has content).

#### `fromHead()`

Returns a placeholder `OgConfigEntry` that resolves to `{ title, description }` strings. Useful as a quick scaffold while you fill in real per-route data.

#### `OgData` interface

The shape returned by every config entry. Augment via module declaration to add fields:

```ts
declare module "@jxdltd/tanstack/og" {
  interface OgData {
    customField?: string;
  }
}
```

The default fields:

| Field         | Type                      |
| ------------- | ------------------------- |
| `title`       | `string` (required)       |
| `description` | `string?`                 |
| `type`        | `"website" \| "article"?` |
| `image`       | `string?`                 |
| `author`      | `string?`                 |
| `date`        | `string?`                 |
| `tag`         | `string?`                 |

#### `RouteParams<P>`

Type-level helper that derives the params object for a given route path string. Used internally; exported for advanced cases.

```ts
type Slug = RouteParams<"/blog/$slug">; // { slug: string }
type Splat = RouteParams<"/files/$">; // { _splat: string }
type None = RouteParams<"/">; // Record<string, never>
type Multi = RouteParams<"/users/$id/posts/$postId">;
//   ^? { id: string; postId: string }
```

### `@jxdltd/tanstack/og/server`

#### `createOgHandler({ config, template, fallback? })`

Returns `(ctx: { request: Request }) => Promise<Response>`.

- `config` — from `defineOgConfig`.
- `template` — from `defineOgTemplate`.
- `fallback?` — optional `(ctx) => Response | Promise<Response>` for unmatched paths (default: `404`).

The matcher is permissive about extension and trailing slashes:

| URL                   | Matches config key    |
| --------------------- | --------------------- |
| `/og/index.png`       | `/`                   |
| `/og/`                | `/`                   |
| `/og/blog.png`        | `/blog/` (or `/blog`) |
| `/og/blog/foo.png`    | `/blog/$slug`         |
| `/og/files/a/b/c.png` | `/files/$`            |

Param values are URL-decoded before being passed to the entry. The cache key is a hash of `JSON.stringify(data)` — so when your data changes, the ETag rotates and downstream caches refresh.

### `@jxdltd/tanstack/og/router`

#### `ogMeta(ctx, options?): OgMetaEntry[]`

`ctx` is the head function's argument. Anything with `match`, `matches`, or `params` works (including a plain object for testing).

Options:

| Option          | Default | Notes                              |
| --------------- | ------- | ---------------------------------- |
| `siteName`      | —       | Adds `og:image:alt`.               |
| `siteUrl`       | —       | When set, image URLs are absolute. |
| `twitterHandle` | —       | Adds `name="twitter:site"`.        |
| `imageWidth`    | `1200`  | Emitted as `og:image:width`.       |
| `imageHeight`   | `630`   | Emitted as `og:image:height`.      |

`ogMeta` is synchronous — it does **not** invoke your config entries. It builds the canonical URL based on the matched route path and params, and the handler reads the data when the URL is fetched. This keeps `head()` cheap and avoids double-fetching.

## Patterns

### Augmenting `OgData` with custom fields

```ts
// src/og/types.ts
declare module "@jxdltd/tanstack/og" {
  interface OgData {
    plan?: "free" | "pro";
  }
}
export {};
```

Now `defineOgConfig` and `defineOgTemplate` see the extra field, and the type of `data` inside your template's `render` is the augmented shape.

### Fallback for unmatched paths

```ts
const handler = createOgHandler({
  config,
  template,
  fallback: () => Response.redirect("/og/index.png"),
});
```

### Per-route override on the meta side

`ogMeta` always emits `og:image` for the current route. If a particular route should advertise a different image (e.g. a YouTube thumbnail for a video page), drop the `ogMeta` spread on that route and emit your own `meta` entries — they'll dedupe by `property`/`name` against any root-level entries.

### Externalising native bindings

`@resvg/resvg-js` ships native bindings. When using Vite + Nitro, externalise it so Rolldown doesn't try to bundle the `.node` file:

```ts
export default defineConfig({
  optimizeDeps: { exclude: ["@resvg/resvg-js"] },
  ssr: {
    external: ["@resvg/resvg-js"],
    optimizeDeps: { exclude: ["@resvg/resvg-js"] },
  },
  plugins: [
    nitro({ rollupConfig: { external: [/^@resvg\//] } }),
    // ...
  ],
});
```

## Caching model

- **HTTP**: `Cache-Control: public, max-age=31536000, immutable` plus an `ETag` derived from the rendered data. CDNs absorb everything past the first miss per region.
- **Origin**: in-process `Map<hash, Uint8Array>` plus an in-flight promise map so concurrent identical requests share a single render. The cache is unbounded — for long-lived workloads behind a hot CDN this is fine; if you have many distinct cards per process consider clearing periodically.

## Limitations

- **Runtime only.** The handler runs on demand. For fully static deployments where no server is available, prerender the OG paths alongside your HTML pages or invoke the handler at build time.
- **Synchronous `ogMeta`.** Because `head()` is typically synchronous and we don't want to double-fetch your data, `ogMeta` only builds URLs — it doesn't run config entries. If you need per-content cache busting in URLs, append a query string yourself (`?v=<hash>`).
- **Native bindings.** `@resvg/resvg-js` is Node-only. For Cloudflare Workers / Deno Deploy, you'll want a wasm fallback (not yet shipped).

## License

[MIT](./LICENSE)
