---
'foldkit': patch
---

Fix a regression where the first dispatch after an idle period could sit unprocessed until a second dispatch arrived. The drain loop's batch-gathering step relied on `Queue.takeAll`, which in Effect 4 blocks until at least one message arrives rather than returning a non-blocking snapshot. Replaces both batch-gathering sites with a `Queue.poll` loop that returns whatever is currently queued, possibly nothing.
