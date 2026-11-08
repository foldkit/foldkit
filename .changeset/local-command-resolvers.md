---
'foldkit': minor
'create-foldkit-app': patch
---

**Breaking:** Make `Story.Command.resolveAll` and `Scene.Command.resolveAll` consume only resolvers supplied to the current call. Unused resolvers are discarded, unrelated Commands remain pending, and callers that reuse a response after a later dispatch must reuse the local resolver step explicitly. `resolveAllExact` remains local and strict; `resolve` is unchanged.
