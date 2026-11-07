---
'foldkit': minor
---

Add contract-first Block construction through ordinary Effect Layers while retaining portable Definition and Composition builders.

Declare one passive `FooBlock` with `Block.make`, a stable unique key, Model, local Message, InitArgs, optional OutMessage and dispatch Context. Export that same Block for parent authorship. Complete its implementation with `FooBlock.makeLayer(Effect.gen(...))`, acquire the registered Bindings, and return their connections under `children` with init, update, view, local lifecycle declarations, and `EffectsLayer`. Export the implementation Layer separately. Complete builder expressions retain their typing inline, as constructor-local values, and across modules. Ordinary applications need no preparation function or assembly annotation.

Construction connects the executable graph without initializing Models, evaluating deferred child arguments, building handler Layers, or starting lifecycle work. Acquired init, update, and operations remain synchronous and pure. Commands retain their handler constructors and Service requirements; Model membership continues to own child occurrence lifetimes. Completion validates exact child connections, operation channels, handler contracts, errors, and original registration identities.

Runtime completion accepts plans only from the declaring Block's original Compositions. Blocks that share a Namespace or identical Schemas cannot substitute another Block's construction plans.

Program and Server hosts acquire graph Layers under their scopes. Supply child implementations and their construction dependencies with ordinary `Layer.provide` on the feature's implementation Layer. Keep ordinary request Services in handler constructors and runtime-only providers under their existing owners.

Add Block-aware Story and Scene entry points. Start with deferred `init(...args)` or `given(model)`; the returned Effect owns construction and cleanup while ordinary test steps stay synchronous. `Story.messageIn` resolves exact direct or nested child delivery against the selected graph. `withBlock` supports advanced fixtures needing acquired pure functions; low-level `Test.toParentMessageFor` preserves provenance for custom adapters. Required view inputs, dispatch context, routing, Commands, errors, Services, and OutMessages retain their contracts through emitted declarations.

Preserve composition of extracted views and same-owner alternate views without exposing private child graphs. Add contract-based variant and map Bindings, deferred dynamic initialization, and schema-specialized family providers. Query and KeyedQuery use their shared construction providers, `Query.layer` and `KeyedQuery.layer`, while retaining fetch behavior, cancellation, freshness, and accepted-completion notifications.

Migrate application examples, Website, Typing Game, UI Blocks, DevTools, generated projects, active documentation, and authoring guidance. Published release examples and accurately labelled migration before examples remain historical records.
