---
'foldkit': patch
---

Clarify the `SubmodelConfig` TSDoc: the OutMessage flow it describes applies to children that declare an OutMessage. Children that declare none return a two-element `[Model, Commands]`, with no third element to unpack.
