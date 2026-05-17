---
'foldkit': patch
'@foldkit/vite-plugin': patch
'@foldkit/devtools-mcp': patch
'create-foldkit-app': patch
---

Bump Effect to `4.0.0-beta.66` across the workspace. This keeps Foldkit aligned with the current Effect v4 beta and updates the exact pins for `effect`, `@effect/platform-browser`, `@effect/platform-node`, `@effect/platform-node-shared`, and `@effect/vitest`.

The upgrade also replaces direct `Option` yields in `Effect.gen` with `Effect.fromOption`, matching the beta.66 generator typing. Behavior is unchanged.

Consumers should align their Effect packages to `4.0.0-beta.66` exactly during the v4 beta window.

```bash
pnpm add effect@4.0.0-beta.66 @effect/platform-browser@4.0.0-beta.66
pnpm add -D @effect/platform-node@4.0.0-beta.66 @effect/vitest@4.0.0-beta.66
```
