---
'foldkit': patch
'@foldkit/ui': patch
'@foldkit/devtools': patch
'@foldkit/devtools-mcp': patch
'@foldkit/vite-plugin': patch
---

Bump Effect to `4.0.0-beta.97` (from `4.0.0-beta.88`). Foldkit's peer dependencies now require `effect@4.0.0-beta.97` and `@effect/platform-browser@4.0.0-beta.97`.

Consumers should align their Effect packages to `4.0.0-beta.97` exactly during the v4 beta window:

```
pnpm add effect@4.0.0-beta.97 @effect/platform-browser@4.0.0-beta.97
pnpm add -D @effect/vitest@4.0.0-beta.97
```
