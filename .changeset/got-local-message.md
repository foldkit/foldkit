---
'@foldkit/oxlint-plugin': patch
---

`foldkit/got-prefix-requires-submodel-payload` now recognizes the Message Schema of a Query defined beside its parent Message union. Previously, `GotPostsMessage: { message: postsQuery.Message }` was reported even when `postsQuery` came from `Query.define`.

Unrelated local objects that happen to expose a `.Message` property still do not count as Submodels, so the rule continues to reject misleading `Got*` Messages.
