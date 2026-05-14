---
'create-foldkit-app': patch
---

Fix `TypeError: state.value.asEffect is not a function` crash on startup. The pinned `@effect/platform-node@4.0.0-beta.64` declares its `@effect/platform-node-shared` dependency with a caret range, so npm would resolve a newer matching beta and pull a second `effect` version alongside the pinned one. The two Effect copies have incompatible runtime protocols, and `Effect.gen` blowing up on the first yield was the visible symptom. Pinning `@effect/platform-node-shared` to `4.0.0-beta.64` as a direct dependency forces npm to reuse the existing copy and prevents the duplicate install.
