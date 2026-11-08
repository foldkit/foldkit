---
'@foldkit/ui': minor
---

Add `PopoverBinding.requestCloseWithoutRestoringFocus()` for parent interactions that already determine the next focus target, such as Tab leaving an owner picker. The existing `requestClose()` operation continues to restore focus to the Popover trigger. When an open Popover closes, both paths emit `Closed`, preserve animation settlement, and perform modal scroll and inert-content cleanup.

Custom Popover implementation Layers must handle the new InMessage in their `inMessageUpdate` record.
