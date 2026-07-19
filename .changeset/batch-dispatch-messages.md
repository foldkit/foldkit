---
'foldkit': minor
'@foldkit/devtools-mcp': minor
---

Add a batch form of Message dispatch to the DevTools MCP surface. The new `foldkit_dispatch_messages` tool enqueues an ordered list of Messages in one call, removing the one-round-trip-per-Message cost of staging multi-Message fixtures. The runtime bridge validates the whole batch against the configured `Message` Schema before enqueueing any of it, so one invalid entry rejects the batch with an error naming its position and nothing is dispatched. The response reports the predicted history index for each Message, mirroring `acceptedAtIndex` on single dispatch.
