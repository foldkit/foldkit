---
'foldkit': patch
---

Suspend the runtime's render loop when nothing is dirty so idle apps schedule zero rAF callbacks. Previously the loop fired ~60 no-op rAF callbacks per second when the app had no Messages to process. The loop now subscribes to the dirty-bit's changes Stream and suspends entirely until the next dispatch.
