---
'foldkit': patch
---

Batch view renders to once per animation frame and yield to the browser between long Message bursts. The runtime now coalesces multiple Messages dispatched between frames into a single render and yields to the browser when message processing exceeds a frame budget. Keeps the UI responsive under high-rate inputs (drag, websocket bursts, recursive Commands).

DevTools: lazy-cache the message list view so re-renders skip work when its inputs are unchanged.
