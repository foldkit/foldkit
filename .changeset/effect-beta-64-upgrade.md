---
'foldkit': patch
'@foldkit/vite-plugin': patch
'@foldkit/devtools-mcp': patch
'create-foldkit-app': patch
---

Bump Effect to `4.0.0-beta.64` (from `4.0.0-beta.59`) across the workspace, and replace the hand-rolled fallback cascade in `route/parser.ts:oneOf` with `Effect.firstSuccessOf`, which was reintroduced in beta.61 ([effect-smol#2120](https://github.com/Effect-TS/effect-smol/pull/2120)).

Consumers should align their `effect`, `@effect/platform-browser`, `@effect/platform-node`, and `@effect/vitest` pins to `4.0.0-beta.64`.

```bash
pnpm add effect@4.0.0-beta.64
pnpm add -D @effect/platform-browser@4.0.0-beta.64 @effect/platform-node@4.0.0-beta.64 @effect/vitest@4.0.0-beta.64
```

Behavior is unchanged. The `oneOf` route parser still tries each parser in order and returns the first success (or the last failure if all fail).
