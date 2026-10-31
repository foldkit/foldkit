---
'@foldkit/oxlint-plugin': minor
---

Lint class Blocks. The rules recognize a Block class, its `make` constructor, and the `update`, `view`, `commands`, `mounts`, and `subscriptions` the constructor returns.

- Add `foldkit/block-name-matches-variable` to the recommended and all presets. It requires a Block class to be named for its Block id, such as `class Search extends Block<Search>()('Search', ...)`, and its Layer to be named `<BlockId>Live`, such as `SearchLive`.
- Rename `foldkit/selection-submodel-factory-at-module-scope` to `foldkit/selection-block-factory-at-module-scope`. It reports a UI factory such as `Listbox.makeBlock` called inside a function instead of at module scope.
- `foldkit/command-define-pascal-const` also requires the const that holds a Command to have the Command's name, which `foldkit/command-binding-matches-name` used to check. Replace that rule with `foldkit/command-define-pascal-const` in explicit configurations.
- `foldkit/mount-factory-must-use-element` checks the handlers in a Block's `mounts` record.
- `foldkit/no-disabling-dev-guardrails` checks for `slow: false` in options passed to `Program.make` and `Program.makeElement`, imported from `foldkit` or `foldkit/program`.
- `foldkit/no-impure-call-at-decision-time` treats the function returned by a `handler` generator, and the implementation passed to `toLayer`, as running when the Runtime performs the work, so time and randomness calls inside them are accepted.

Remove these rules from explicit configurations. Child instances route their own Messages, so there are no `Got*` wrappers or child folds left for them to check:

- `foldkit/command-binding-matches-name`
- `foldkit/got-prefix-requires-submodel-payload`
- `foldkit/got-submodel-message-name`
- `foldkit/got-wrapper-carries-only-routing`
- `foldkit/no-child-message-construction-in-root`
- `foldkit/no-direct-submodel-state-update`
- `foldkit/no-empty-to-parent-out-message`
- `foldkit/require-fold-for-child-update-result`
- `foldkit/wrap-child-output-in-got-message`

The plugin supports Node `^20.19.0 || >=22.12.0`.
