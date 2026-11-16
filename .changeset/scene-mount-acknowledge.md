---
'foldkit': minor
---

Add `Scene.Mount.acknowledge(...matchers)` to clear pending Mounts without dispatching a Message. Use it for Mounts declared with `messages: [Schema.Never]`, which have no result Message to pass to `Mount.resolve`. Definitions match by name, and instances match by name and args. Each matcher acknowledges one pending occurrence and throws if none matches. Acknowledged Mounts require `Mount.expectEnded` when their elements leave the tree.
