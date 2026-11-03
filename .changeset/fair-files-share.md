---
'foldkit': minor
---

Add contract-first Block construction through ordinary Effect Layers while retaining portable Definition and Composition builders.

Declare a stable unique key, Model, local Message, Init, optional OutMessage and dispatch Context once. Export `Definition.contract` for parent authorship. Complete the implementation with `Definition.makeBlock(Effect.gen(...))`, yield the registered Bindings, and return their acquired connections under `children` with init, update, view, local lifecycle declarations, and `EffectsLayer`. Export the implementation Layer separately. Complete builder expressions retain their typing inline, as constructor-local values, and across modules. Ordinary applications need no preparation function or assembly annotation.

Construction connects the executable graph without initializing Models, evaluating deferred child arguments, building handler Layers, or starting lifecycle work. Acquired init, update, and operations remain synchronous and pure. Commands retain their handler constructors and Service requirements; Model membership continues to own child occurrence lifetimes. Completion validates exact child connections, operation channels, handler contracts, errors, and original registration identities.

Runtime completion accepts plans only from the calling Definition's original Compositions. Definitions that share a Namespace or identical Schemas cannot substitute another Definition's construction plans.

Program and Server hosts acquire graph Layers under their scopes. `program.provide({ services, runtime })` supplies Services shared by construction and execution, with optional providers built after ManagedResource handles exist. `program.provide(layer)` remains runtime-only. A Block descriptor's `.provide(layer)` supplies construction dependencies.

Add Block-aware Story and Scene entry points. Start with deferred `init(...args)` or `given(model)`; the returned Effect owns construction and cleanup while ordinary test steps stay synchronous. `Story.messageFrom` resolves exact child delivery against the selected graph. `withBlock` supports advanced fixtures needing acquired pure functions, and `Test.toParentMessageFor` preserves provenance for direct and nested child delivery. Required view inputs, dispatch context, routing, Commands, errors, Services, and OutMessages retain their contracts through emitted declarations.

Preserve composition of extracted views and same-owner alternate views without exposing private child graphs. Add contract-based variant and map Bindings, deferred dynamic initialization, and schema-specialized family providers. Query and KeyedQuery use a shared `Query.layer` provider while retaining fetch behavior, cancellation, freshness, and accepted-completion notifications.

Migrate application examples, Website, Typing Game, UI Blocks, DevTools, generated projects, active documentation, and authoring guidance. Published release examples and accurately labelled migration before examples remain historical records.
