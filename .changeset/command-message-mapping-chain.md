---
'foldkit': minor
---

`Command.mapMessage` / `Command.mapMessages` now record their message mapping on the Command as recoverable metadata, in addition to fusing it into the Effect as before. Production dispatch is unchanged, but the Story and Scene test layers can now replay a Command's own wrapping when you resolve it. Scene mounts get the parallel treatment: a mount rendered inside an `h.submodel` boundary snapshots that boundary's `toParentMessage` lift at render time, so `Scene.Mount.resolve` can replay it too.

BREAKING: the third `toParentMessage` argument to `Story.Command.resolve` / `Story.Command.resolveAll`, their `Scene` equivalents, and `Scene.Mount.resolve` / `Scene.Mount.resolveAll` is removed. Resolve a Command or mount with the child's raw result Message and the parent's own wrapping (a Command's `Command.mapMessages`, or a mount's Submodel-boundary lift) is replayed for you, so a test no longer restates the wrapping by hand. Migrate `resolve(Def, result, message => GotChildMessage({ message }))` to `resolve(Def, result)`, and the analogous `resolveAll` tuples from `[Def, result, mapper]` to `[Def, result]`.
