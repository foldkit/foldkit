# @foldkit/oxlint-plugin

Oxlint rules for Foldkit applications. Extend `recommended.json` for the full supported convention set, or `all.json` to enable every rule. Both presets enable `foldkit/block-name-matches-variable` at error severity.

`foldkit/block-name-matches-variable` requires a direct literal Block authoring declaration to use the `<BlockId>` identifier. A Composition derived in the same file uses `<BlockId>Composition`:

```ts
const People = Block.define('People', { Model, Message })
const PeopleComposition = People.makeComposition()
```

Application authoring values use `Application`, and their Compositions use `ApplicationComposition`. The rule follows supported `foldkit` root, `foldkit/block`, and `foldkit/application` imports, including namespace and import aliases. It follows inline chains and authoring values declared in the same file. A Composition derived from an authoring value imported from another local module is not verified because Oxlint does not expose cross-module symbol or type information. Dynamic names are left for the developer to review.
