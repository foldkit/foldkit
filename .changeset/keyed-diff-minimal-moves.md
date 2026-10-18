---
'foldkit': patch
---

Filtering a keyed list could move retained rows even when their relative order already matched the next list. The differ now lazily checks the next keys and defers removal of children absent from the next list, avoiding those unnecessary moves. Keyed matching and DOM order for retained children are unchanged.
