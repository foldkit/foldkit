---
'foldkit': patch
---

`match` on a `defineTaggedUnion`, `defineMessageUnion`, or `defineRouteUnion` now infers the union of the handler return types when no output type argument is given. Handlers that return different variants of another union typecheck, and the result is that union.

Passing an output type argument still constrains every handler, including `Message.match<Update.Return<Model, Message>>(...)`. The optional second type argument still preserves a narrower input in each handler.
