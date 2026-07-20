---
'@foldkit/vite-plugin': patch
---

The view-identity transform no longer un-brands a consumer module whose own path merely contains the `packages/foldkit/` segment (a workspace named `foldkit`, or a vendored fork holding application code). When the installed foldkit package resolves, the plugin's precise package-root gate is authoritative and the coarse path fragment is left to the resolution-failed fallback, so such a module keeps its branch identity instead of silently losing it.
