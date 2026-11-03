---
'foldkit': minor
---

Add `Scene.Mount.emit` for later Messages from a resolved, still-mounted stream Mount. Resolve the first result with `Scene.Mount.resolve`, then emit subsequent results without consuming the active registration. Emissions retain source and occurrence matching, declared payload validation, child boundary lifting, and ordinary pending-effect checks. One-shot Mount resolution is unchanged.
