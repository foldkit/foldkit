---
'foldkit': patch
---

Improve DevTools performance with large models by replacing Schema.equivalence with reference equality for the isModelChanged flag, computing model diffs eagerly at record time instead of on-demand during inspection, and gating the store subscription on panel visibility to skip work when DevTools is closed.
