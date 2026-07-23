# @jxdltd/tanstack

## 0.1.0

### Minor Changes

- c14aec3: Add `@jxdltd/tanstack/og/edge`, a wasm-based OG handler entry for Cloudflare Workers, Vercel Edge, and Deno Deploy. It renders with `satori/standalone` and `@resvg/resvg-wasm` and takes a required `wasm: { yoga, resvg }` option carrying the wasm binaries, initialized lazily on the first matching request.

  Both `og/server` and `og/edge` now also accept an optional `cache: { get, set }` option to replace the default in-process `Map` PNG cache, e.g. with the Cache API on workers.

  `@resvg/resvg-js` moved from `dependencies` to `optionalDependencies`, so an install failure on platforms without prebuilt binaries no longer blocks edge-only usage. The `og/server` API is unchanged.

## 0.0.1

### Patch Changes

- 98d79ee: Initial release.

  Subpath entrypoints:
  - `@jxdltd/tanstack/og` — types, `defineOgConfig`, `defineOgTemplate`, `ignore` sentinel, `fromHead` placeholder, augmentable `OgData` interface.
  - `@jxdltd/tanstack/og/server` — `createOgHandler` for a server route at `/og/$`. Matches static keys, named params, and splat; renders via Satori + Resvg; emits `image/png` with immutable cache headers and an ETag derived from the rendered data; in-process cache + in-flight dedupe.
  - `@jxdltd/tanstack/og/router` — `ogMeta(ctx, options?)` for emitting the canonical `og:*` / `twitter:*` head entries with a typed image URL.
