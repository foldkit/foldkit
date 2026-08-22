---
'foldkit': minor
---

The experimental Machine's `Ignored` result now carries a required `reason` field, typed as the new `IgnoredReason` export, so a step that matched no Edge says why. `OutOfAlphabet` means the Message tag appears in no state's `on` record anywhere in the table. `NotApplicable` means the tag is in the Machine's alphabet but no Edge for it exists from the current state. `GuardsFellThrough` means an Edge entry exists for this state and Message but every guard declined and no `otherwise` was present, which previously looked identical to a Message the Machine never handles.
