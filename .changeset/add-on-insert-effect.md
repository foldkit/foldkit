---
'foldkit': minor
---

Add `OnInsertEffect` attribute for Effect-based DOM lifecycle hooks. The callback runs when the element is inserted and returns an `Effect<Message>` that the runtime executes, dispatching the resulting message. This lets consumers integrate third-party DOM libraries (editors, embeds, charts) declaratively — failure handling stays in the Model via Messages instead of imperative DOM mutation. Pairs with the existing `OnInsert` for cases that don't need to produce a Message.
