---
'foldkit': patch
---

Report mixed raw local and connected Step results on the offending update handler. The diagnostic recommends `Definition.makeStep` or a focused Step helper for local branches and appears in both ordinary `makeUpdate` records and `.withContext` records. Existing acceptance, rejection and runtime behavior are unchanged; raw-only handlers need no wrapper.
