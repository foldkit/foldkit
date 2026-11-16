---
'foldkit': minor
---

Add `Scene.Mount.acknowledge` for Mounts that never produce a Message. A Mount declared with `messages: [Schema.Never]` (a key listener, an observer that runs until its element leaves) had no result Message to pass to `Mount.resolve`, so the first interaction after it rendered threw "I found unresolved Mounts". `Mount.acknowledge(Definition | instance, ...)` clears one pending occurrence per matcher without sending anything through update; the Mount still needs `Mount.expectEnded` when its element unmounts.
