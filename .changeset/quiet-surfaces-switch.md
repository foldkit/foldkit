---
'foldkit': patch
---

Reacquire a Scene Mount when a retained element switches to another persistent keyed child that renders OnMount. Keep the original acquisition and result routing when the same owner rerenders, including when that owner omits the Mount attribute and later restores it.
