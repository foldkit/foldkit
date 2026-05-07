---
'foldkit': minor
---

feat(foldkit): add `Html.mapMessage` for remapping submodel view Messages

Adds `Html.mapMessage`, the view-layer counterpart to `Command.mapEffect` and `Mount.mapMessage`. Lets a reusable child view stay non-generic over its parent's Message type: the child writes `view: (model) => Html<ChildMessage>` with internal helpers that produce `Html<ChildMessage>`, and the parent embeds it with `Html.mapMessage(GotChildMessage)(childView(model))`.

Implemented by providing a wrapped `Dispatch` service to the child Effect, so every `dispatchSync` and `dispatchAsync` call inside the child runs through `toParentMessage` before reaching the runtime. There is no VNode tree walk; Effect's context propagation handles the rewiring.

Also adds a `Message` type parameter to `Html<Message = unknown>` (defaulting to `unknown`, so existing unparameterized `Html` annotations continue to compile). The parameter is a phantom that lets `mapMessage` carry inference across submodel boundaries.
