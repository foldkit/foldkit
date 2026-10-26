---
'foldkit': minor
'create-foldkit-app': patch
---

Add `Definition.makeOutMessageStep(producer)` for a Step or handler that preserves the Model and emits a declared OutMessage without Commands. The producer can read the current Model and exact Message; use `.fromMessage` for a payload-only producer or `() => outMessage` for a fixed value. The helper retains exact OutMessage payloads and refined Model types. Use `Update.withOutMessage` when attaching a known or optional OutMessage to an existing result.

Model-only field and no-op Step contracts now explicitly forbid Commands and OutMessages. This prevents mixed inferred Step lists from hiding an emitted OutMessage before `Update.combineSteps` validates them. Their runtime results remain unchanged.

Update scaffold guidance to choose the narrow owned Step helper for field changes, no-op handling, existing Commands, and known OutMessages.
