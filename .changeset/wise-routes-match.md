---
"@jxdltd/tanstack": patch
---

Key `OgConfig` by each route's resolved `fullPath` instead of its route ID, so config keys match the URL paths the runtime matcher receives. Previously, apps with pathless layout routes were forced to use keys like `/_layout/about` that could never match at runtime. Pathless layout routes themselves (which resolve to an empty path) no longer require a config entry. The generic `OgConfigFor<TRoutes>` type is now exported.
