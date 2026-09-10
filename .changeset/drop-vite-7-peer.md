---
'@foldkit/vite-plugin': minor
'@foldkit/markdown': minor
---

Drop Vite 7 from the `vite` peer range. Both packages now require Vite ^8.0.0, and the Vite plugin's tests run against the one installed major. The plugin's `transformViewIdentity` returns magic-string's source map unchanged, since Rolldown accepts it as generated; the normalization Rollup needed under Vite 7 is gone, and `map.file` in `ViewIdentityTransformResult` is typed `string | undefined`.
