---
'foldkit': minor
---

`Command.Interruptible.define` now accepts an optional `toKey` on the with-args form. Omit it when at most one invocation is meaningfully in flight, and the key is the Command name, exactly like the no-args form, with `Interrupt` taking only `toMessage`. This drops the empty `{}` key args a single-instance submit flow was forced to pass. Provide `toKey`, derived from the owning Model identity, when invocations run concurrently and must be interrupted independently.
