---
'foldkit': patch
---

Reuse a Block view's scoped Effect Context across renders when its Runtime occurrence is unchanged. New Models, render frames, Ref values, and occurrence resources remain live; generation changes and DevTools replay still establish fresh scoped Contexts.
