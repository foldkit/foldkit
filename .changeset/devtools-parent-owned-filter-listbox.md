---
'@foldkit/devtools': patch
---

Migrate the overlay's Message filter Listbox to the parent-owned selection API in `@foldkit/ui`. The overlay's `maybeSubmodelFilter` field is now the single source of truth: the Listbox view reads it through `ViewInputs.maybeSelectedValue`, and the redundant sync that mirrored the filter back onto the Listbox Model when a stale filter reset is gone. No behavior change.

Part of #676.
