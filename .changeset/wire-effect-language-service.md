---
---

Wire `@effect/language-service` into `tsconfig.base.json` with a browser / TEA
severity preset, so every package, example, and scaffolded app gets Effect-4
semantic diagnostics (floating Effects, missing channels, Schema over JSON) in
the editor. See `docs/effect-language-service.md` for the preset and the one-time
`effect-language-service patch` step that also surfaces them under `tsc` / CI.
