---
'foldkit': minor
---

Require a non-empty list of result Message Schemas in `Command.define`, `Mount.define`, and `Mount.defineStream`. Reject entries whose decoded type is `never`, including aliases of `Schema.Never`. These declarations produce a TypeScript error.

To migrate an empty or `Schema.Never` declaration, declare the Message that records the work's result. For setup that completes without changing the Model, return a descriptive `Completed*` Message and leave the Model unchanged in update. Mount setup can return that Message after registering cleanup with `Effect.acquireRelease`; its scope stays open until the element unmounts.

Shared declarations must preserve a non-empty tuple instead of widening to `ReadonlyArray<Schema.Top>`. Generic definition factories can accept `Command.ResultMessageSchemas<Messages>` or `Mount.ResultMessageSchemas<Messages>` to forward the validation without copying it. Pass the same `Messages` type argument explicitly when calling the definition constructor.
