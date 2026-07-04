---
'foldkit': minor
---

Add `Story.fromSession`, which lowers a captured session artifact into a runnable regression `Story`. The artifact is init Model plus an ordered log of entries (each a dispatched Message, the Commands it triggered, and the resulting Model snapshot), decoded with `Schema` against the app's Model and Message Schemas. Each entry dispatches its Message as fresh input, or, when Commands from earlier entries are still pending, resolves the oldest pending Command with this entry's Message, mirroring how a Command's outcome surfaces as its own later Message entry in the log. Every entry asserts the replayed Model against its recorded snapshot, so the generated story fails the moment replay drifts from the capture. Splice the result into `Story.story(update, ...Story.fromSession(artifact, { Model, Message }))`.
