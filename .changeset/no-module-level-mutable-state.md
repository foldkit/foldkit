---
'@foldkit/oxlint-plugin': minor
'create-foldkit-app': minor
---

Add `foldkit/no-module-level-mutable-state`, a lint rule that flags module-level
`let` and `var` declarations (including `export let`), which hold state outside
the Model. Ambient `declare let` declarations are not flagged. Scaffolded
projects enable the rule in their generated `.oxlintrc.json`.

Ported from the purity-boundary rule family in `@mpsuesser/oxlint-plugin-foldkit`
by Marc Suesser.
