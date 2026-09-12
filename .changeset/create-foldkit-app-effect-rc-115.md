---
'create-foldkit-app': minor
---

Bump bundled Effect dependencies to `4.0.0-rc.115`. Newly scaffolded apps will get the updated pins from the example sources and use Vitest 5, which is required by `foldkit/test/vitest` and `@effect/vitest@4.0.0-rc.115`.

The CLI now pins `effect`, `@effect/platform-node`, and `@effect/platform-node-shared` to exactly `4.0.0-rc.115` to match this release (exact versions, not ranges, while Effect v4 is in prerelease).
