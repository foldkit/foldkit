---
'foldkit': minor
'@foldkit/ui': minor
'create-foldkit-app': patch
---

Name a Block's positional initializer Schema `InitArgs` instead of `Init`. Update the contract key in authored Blocks and generic public contracts; the old key is not an alias. The initializer itself remains `init`, authored through `Composition.makeInit`.

Add `Composition.acquireChildren()` for constructors that only collect their registered child implementations. It returns the exact ordered connection tuple and preserves construction requirements, errors, identities and scoped cleanup. It does not initialize Models, evaluate deferred child arguments, build handlers or start lifecycles. Individual Binding yields remain available when construction needs the handles.

Allow a keyed-array `init` policy to omit an identity `toItem` when the collection stores the exact child Models directly. Wrapped items and parent metadata still require an explicit adapter. Preserve key validation, deferred arguments and child init Commands.

Extend `Story.messageIn` to nonempty Binding paths. Each keyed segment is `{ binding, key }`; the selected acquired graph checks ownership and constructs nested envelopes. Existing direct and keyed calls keep their behavior.

Add `Story.Command.expectExactInOrder` and `Scene.Command.expectExactInOrder`. They preserve original Definition identity, exact arguments, occurrence matching and exact counts while also checking dispatch order. Existing `expectExact` remains order-independent; neither helper sequences effects or completion.

Migrate application tests to explicit immutable fixture Effects and direct Story steps, inline single-use OutMessage folds where they clarify the relationship, and update scaffolds and authoring guidance. Keep explicit no-op responses and justified shared or substantial fold extractions.
