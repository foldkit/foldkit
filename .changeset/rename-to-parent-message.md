---
'foldkit': minor
---

Rename `toMessage` to `toParentMessage` across all UI component `ViewConfig` types and the test module. The new name makes the semantics unambiguous — it always maps a child module's Message to the immediate parent's Message type, regardless of nesting depth.
