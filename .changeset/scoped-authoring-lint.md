---
'@foldkit/oxlint-plugin': patch
---

Keep init, update, view and Step producers pure when authored inside a Block's Effect constructor. The decision-time impurity rule now stops at these pure callback boundaries while retaining deferred Effect and attached handler execution. Recognize current independent contract authoring in integration coverage and point Schema composition diagnostics to `Definition.contract.Model`.
