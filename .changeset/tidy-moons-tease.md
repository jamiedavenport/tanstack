---
"@jxdltd/tanstack": minor
---

Add `@jxdltd/tanstack/og/edge`, a wasm-based OG handler entry for Cloudflare Workers, Vercel Edge, and Deno Deploy. It renders with `satori/standalone` and `@resvg/resvg-wasm` and takes a required `wasm: { yoga, resvg }` option carrying the wasm binaries, initialized lazily on the first matching request.

Both `og/server` and `og/edge` now also accept an optional `cache: { get, set }` option to replace the default in-process `Map` PNG cache, e.g. with the Cache API on workers.

`@resvg/resvg-js` moved from `dependencies` to `optionalDependencies`, so an install failure on platforms without prebuilt binaries no longer blocks edge-only usage. The `og/server` API is unchanged.
