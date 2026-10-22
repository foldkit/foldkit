---
'foldkit': patch
---

Reduce the type-checking cost of HTML attributes in views. `Attribute` is now declared as an explicit union of its variants instead of being computed through `Data.TaggedEnum`, so the variants that do not mention the Message type are shared across every view instead of being rebuilt for each Message. The resulting type is identical, and the attribute constructors are unchanged.
