---
'@foldkit/oxlint-plugin': patch
---

Recognize `makeReceive` and `makeReceive.withContext` as pure Block authoring boundaries. Track inline and extracted receive handlers when checking child Model ownership and local Message ownership, while preserving deferred Effect execution and allowing parents to construct public InMessages.

Allow explicit result Messages in imported Story and Scene Command resolvers, including documentation examples outside test filenames. Keep matcher positions, parent-authored transitions, and lookalike APIs subject to child Message ownership checks.
