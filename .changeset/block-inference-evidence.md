---
'foldkit': patch
'create-foldkit-app': patch
---

Reduce inference when extracting registration evidence from returned Commands, fixing TS2589 in the reported large Root composition. Read a declared `commands` property directly while retaining the previous inference for index-only shapes. Direct result evidence, deferred obligations and registration checks remain intact.

Fix `Composition.makeUpdate.withContext` records that mix direct Binding operations with callback handlers. A compatible Step can be a contextual handler directly, without the `model => step(model)` adapter previously recommended in the guides and scaffold. The update retains exact Model, Message, Command, OutMessage, context and registration contracts.
