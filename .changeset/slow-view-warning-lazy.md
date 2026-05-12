---
'foldkit': patch
---

Rephrase the default slow view warning to point at `createLazy` / `createKeyedLazy` as the primary remedy, and mention that the threshold can be adjusted or warnings disabled via the `slowView` option. The previous wording suggested "moving computation to update", which could nudge readers toward storing derived state in the Model.
