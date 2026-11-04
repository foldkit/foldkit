---
'foldkit': minor
'@foldkit/ui': minor
---

Add `Block.make` declarations with bound authoring helpers and `makeLayer` completion returning an ordinary Effect Layer. Portable Composition builders retain their inferred contracts across modules, and Program, Server, Story, and Scene accept the declared Block with its selected implementation Layer.

Validate exact selected-provider requirements and constructor Plan ownership while preserving deferred initialization, original handler identities, constructor errors, and Model-owned child lifecycles.

Migrate concrete declarations from `FooDefinition` and `FooDefinition.contract` to one `FooBlock = Block.make(...)`. Complete its implementation with `FooBlock.makeLayer(...)`, compose child providers with `Layer.provide`, and pass `{ block: FooBlock, layer }` to Program, Server, Story and Scene. Acquire pure test functions through scoped `withBlock`; public UI and Query factory contracts do not expose a getter. UI factories retain their `makeBlock` names.

Query's `handler` generator config creates a selected factory contract with exact Service and error requirements. Its factory-specific `provideHandlers` specializes those facts before Binding. Ordinary declared Blocks supply original handlers through the curried `FooBlock.provideHandlers(handlers)(layer)` Layer transformer.
