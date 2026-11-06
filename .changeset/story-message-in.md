---
'foldkit': minor
'create-foldkit-app': patch
---

Rename the Block-aware Story child-delivery step from `Story.messageFrom` to `Story.messageIn`. The step handles a local Message in the bound child, then exposes the composed parent result from the child update and Binding fold. It is not a formal Block InMessage and does not imply a sender.

Update application Stories to call `Story.messageIn(binding, message)`, or `Story.messageIn(binding, key, message)` for a keyed Binding. The step remains passive, resolves against the Story's acquired graph, preserves the Binding's routing and OutMessage policy, and does not simulate live Runtime generation admission. The old export is removed without an alias.
