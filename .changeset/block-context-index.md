---
'foldkit': patch
---

Improve startup scaling for applications with many sibling Blocks. Index each immutable parent Context once and reuse its local capability projections instead of scanning every sibling's handlers for each placement.

Apply the active instance cursor after projection so repeated placements and keyed instances retain their own ManagedResources and interruption identities. Ordinary Services keep their shared identity and application lifetime.
