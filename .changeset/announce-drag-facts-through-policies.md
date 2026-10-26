---
'@foldkit/ui': minor
'@foldkit/oxlint-plugin': minor
'create-foldkit-app': patch
---

Expose DragAndDrop keyboard pickup and target changes as `StartedKeyboardDrag` and `ChangedKeyboardTarget` OutMessages. Exhaustive parent policies must handle these cases. Target changes describe the proposed keyboard position and preserve existing focus Commands; unchanged targets emit no notification.

Add the recommended `no-binding-write-coordination` lint rule for proven direct-field Bindings whose writers derive unrelated parent fields from the next child Model. Keep parent reactions in OutMessage policies and custom writers focused on child placement, preserving wrapped/keyed storage and metadata.
