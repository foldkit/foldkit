---
'foldkit': minor
'@foldkit/ui': minor
'@foldkit/devtools': minor
'@foldkit/devtools-mcp': minor
'@foldkit/vite-plugin': minor
---

Bump Effect to `4.0.0-beta.88` (from `4.0.0-beta.83`). Foldkit's peer dependencies now require `effect@4.0.0-beta.88` and `@effect/platform-browser@4.0.0-beta.88`.

Consumers should align their Effect packages to `4.0.0-beta.88` exactly during the v4 beta window:

```bash
pnpm add effect@4.0.0-beta.88 @effect/platform-browser@4.0.0-beta.88
pnpm add -D @effect/vitest@4.0.0-beta.88
```
