---
"@jxdltd/tanstack": patch
---

Make every `OgConfig` entry optional. Requiring all routes forced real apps to declare dozens of `ignore` entries for routes that never need an OG card. Routes without an entry fall through to the handler's `fallback` (or a 404) at runtime, as before. Annotate your config with `Required<OgConfig>` if you still want exhaustiveness enforced.
