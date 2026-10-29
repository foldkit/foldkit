---
'foldkit': patch
---

DevTools dispatch now answers with an error when update does not process a dispatched Message. Before, `foldkit_dispatch_message` and `foldkit_dispatch_messages` returned history indices for Messages that never got a history entry, so an agent was told its Messages were accepted while the application did not change. This happened in three cases:

- The runtime had already crashed or been disposed.
- Update threw on the dispatched Message.
- The runtime crashed or was disposed while the Message waited in the queue.

The bridge now waits until update has processed each Message before it answers. When the runtime stops partway through a batch, the error says how many Messages update processed and gives their predicted history indices.
