---
'create-foldkit-app': patch
---

Raise `engines.node` to `>=22.19.0` to match the actual runtime requirement. `@effect/platform-node` pulls `undici@8.x`, which requires Node 22.19. The previous `>=18.0.0` declaration was misleading — installs on older Node versions surfaced an `EBADENGINE` warning pointing at the transitive `undici` package rather than at `create-foldkit-app` itself. The runtime requirement is unchanged; this only corrects the manifest.
