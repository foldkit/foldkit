---
'@foldkit/oxlint-plugin': patch
---

Recognize qualified Command names produced by an owning Block in the Command declaration and definition-name rules. The local name still must be a PascalCase literal and match its definition binding.

Add `foldkit/block-name-matches-variable` to the recommended and all presets. Literal `Block.define` declarations use the `<BlockId>` identifier: `const Home = Block.define('Home', ...)`. Inline and same-file `makeComposition` chains use `<BlockId>Composition`. Root authoring and Composition values use `Application` and `ApplicationComposition`. The rule follows supported Foldkit API imports and aliases; it does not infer the identity of an authoring value imported from another local module.
