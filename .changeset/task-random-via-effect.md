---
'foldkit': patch
'@foldkit/vite-plugin': patch
---

`Task.randomInt` and `Task.uuid` now delegate to Effect's `Random` service (`Random.nextIntBetween` with `{ halfOpen: true }` and `Random.nextUUIDv4`) instead of `Math.random()` and `crypto.randomUUID()`. Public API and semantics are unchanged: `Task.randomInt(min, max)` is still half-open (`max` exclusive) and `Task.uuid` still returns an RFC 4122 v4 UUID. The benefit is testability. Consumers can now seed both Tasks deterministically by piping their program through `Random.withSeed("seed")`.

The Vite plugin's force-included Effect namespace list gains `effect/Random` so consumer dev servers prebundle the namespace foldkit's compiled dist now references.
