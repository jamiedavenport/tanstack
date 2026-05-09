---
"@jxdltd/tanstack": patch
---

Initial release.

Subpath entrypoints:

- `@jxdltd/tanstack/og` — types, `defineOgConfig`, `defineOgTemplate`, `ignore` sentinel, `fromHead` placeholder, augmentable `OgData` interface.
- `@jxdltd/tanstack/og/server` — `createOgHandler` for a server route at `/og/$`. Matches static keys, named params, and splat; renders via Satori + Resvg; emits `image/png` with immutable cache headers and an ETag derived from the rendered data; in-process cache + in-flight dedupe.
- `@jxdltd/tanstack/og/router` — `ogMeta(ctx, options?)` for emitting the canonical `og:*` / `twitter:*` head entries with a typed image URL.
