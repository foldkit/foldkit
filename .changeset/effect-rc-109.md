---
'foldkit': minor
'@foldkit/ui': minor
'@foldkit/devtools': minor
'@foldkit/devtools-mcp': minor
'@foldkit/markdown': minor
'@foldkit/vite-plugin': minor
---

Bump Effect to `4.0.0-rc.109` (from `4.0.0-rc.108`). Foldkit's `effect` peer dependency now requires `4.0.0-rc.109`, and `@foldkit/devtools` pins its `@effect/platform-browser` peer dependency to the same version.

Pin your Effect packages to `4.0.0-rc.109` to match this release. While Effect v4 is in prerelease, pin the exact version rather than a range:

```sh
pnpm add effect@4.0.0-rc.109 @effect/platform-browser@4.0.0-rc.109
pnpm add -D @effect/vitest@4.0.0-rc.109
```
