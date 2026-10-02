---
'@foldkit/ui': patch
'@foldkit/devtools': patch
'@foldkit/devtools-mcp': patch
'@foldkit/markdown': patch
'@foldkit/vite-plugin': patch
'@foldkit/oxlint-plugin': patch
---

Correct the `engines.node` range of six packages. Each one accepted Node versions that the packages it runs with reject, so an install on those versions passed the Foldkit engine check and then failed, or warned, on the dependency.

`@foldkit/ui`, `@foldkit/devtools`, and `@foldkit/devtools-mcp` declared `>=18.0.0` while requiring a `foldkit` that needs `>=20.19.0`. They now declare `>=20.19.0`.

`@foldkit/markdown` declared `>=18.0.0` and `@foldkit/vite-plugin` declared `>=20.19.0`, while both require Vite 8, which needs `^20.19.0 || >=22.12.0`. They now declare the Vite range, which excludes Node 21 and Node 22.0 through 22.11.

`@foldkit/oxlint-plugin` declared `>=20.19.0 || >=22.12.0`, a copy of the Oxlint range with the caret lost. The second clause added nothing, so the range accepted the Node 21 and early Node 22 versions that Oxlint rejects. It now declares Oxlint's `^20.19.0 || >=22.12.0`.

This changes no supported install. Foldkit, Vite, and Oxlint already refused the Node versions these ranges now exclude.
