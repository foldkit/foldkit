---
'@foldkit/oxlint-plugin': patch
---

Stop `foldkit/keyed-required-for-mapped-rows` from reporting a `map` over a container that holds at most one value.

The rule reported `AsyncData.map(data, row => h.div([h.OnClick(Message.ClickedRow({ id: row.id }))], [row.name]))` as a list that needs `keyed`. `AsyncData` holds at most one value, so there are no rows to key. The rule now skips `AsyncData.map` imported from `foldkit` or `foldkit/asyncData`.

The same false report applied to Effect modules that the rule did not know. It now skips `map` from `Arbitrary`, `Cause`, `Channel`, `Config`, `Logger`, `Schedule`, `SchemaGetter`, `Sink` and `UndefinedOr`, and from the nested modules `Argument`, `Flag`, `Param` and `Prompt` in `effect/cli` and `AsyncResult` and `Atom` in `effect/reactivity`. A `map` from a collection module such as `Array`, `Chunk`, `HashMap`, `HashSet`, `Iterable`, `Record` or `Trie` is still reported.
