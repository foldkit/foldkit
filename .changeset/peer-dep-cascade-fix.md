---
'@foldkit/vite-plugin': patch
'@foldkit/devtools-mcp': patch
---

Broaden the `foldkit` peer dependency from `^0.76.0` to `^0` so future foldkit minor releases don't trigger an unwanted major version cascade in dependent packages. The repo's `version-packages` script now resets these peer dep ranges back to broad form after `changeset version` runs, preventing the narrowing that was causing `onlyUpdatePeerDependentsWhenOutOfRange` to fire on every minor.
