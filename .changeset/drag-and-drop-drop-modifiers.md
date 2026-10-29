---
'@foldkit/ui': minor
---

Add `modifiers` to the DragAndDrop `Reordered` OutMessage: the `shiftKey`, `ctrlKey`, `altKey`, and `metaKey` state of the `pointerup` or the Space or Enter key that ended the drag. An application can now decide from the drop itself whether a held key turns a move into a copy.

`DragAndDrop.Message.ReleasedPointer` and `DragAndDrop.Message.ConfirmedKeyboardDrop` now require a `modifiers` field. Tests that construct these Messages pass `{ modifiers: { shiftKey: false, ctrlKey: false, altKey: false, metaKey: false } }` for a drop with no keys held.
