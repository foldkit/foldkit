---
'foldkit': minor
---

`Story.Command.resolve` and `Scene.Command.resolve` now accept a bare interruptible Command definition (from `Command.Interruptible.define`), matching it by name the way their `expectHas` and `expectExact` counterparts already do. Previously the definition overload only accepted plain `Command.define` definitions, so resolving an interruptible Command by its definition failed to typecheck and forced a resolve-by-instance workaround.
