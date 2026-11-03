---
'@foldkit/vite-plugin': patch
---

Reject unsupported SSR build watch configuration before starting a build, with a diagnostic pointing to the Vite development server or full rebuilds. This covers top-level and environment-specific `build.watch` settings for both plugin entry points, while preserving client-only watch mode. Fixes [#1879](https://github.com/foldkit/foldkit/issues/1879).
