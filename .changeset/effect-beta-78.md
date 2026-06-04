---
'foldkit': minor
'@foldkit/vite-plugin': minor
'@foldkit/devtools-mcp': minor
---

Bump Effect to `4.0.0-beta.78` (from `4.0.0-beta.66`). Foldkit's peer dependencies now require `effect@4.0.0-beta.78` and `@effect/platform-browser@4.0.0-beta.78`.

beta.68 removed `Random.nextUUIDv4`, so the browser examples that generate UUIDs now use the platform-backed `Crypto` service's `randomUUIDv4`. Behavior is unchanged apart from UUIDs now coming from cryptographic platform randomness.

Consumers should align their Effect packages to `4.0.0-beta.78` exactly during the v4 beta window:

```bash
pnpm add effect@4.0.0-beta.78 @effect/platform-browser@4.0.0-beta.78
pnpm add -D @effect/vitest@4.0.0-beta.78
```
