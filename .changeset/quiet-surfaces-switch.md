---
'foldkit': patch
---

Reacquire a Scene Mount when a retained element switches to another persistent keyed child that renders OnMount. Preserve acquisition arguments across the same owner's rerenders, including marker omission and restoration. Block-aware Scenes deliver results through the currently rendered boundary while the acquiring occurrence remains active.
