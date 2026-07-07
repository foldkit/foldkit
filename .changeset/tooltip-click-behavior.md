---
'@foldkit/ui': patch
---

`Ui.Tooltip` no longer hides when the trigger is pressed. Tooltips hide only on pointer-leave, blur, or Escape. Escape still suppresses re-opening until the user disengages.

`PressedPointerOnTrigger` now carries only `pointerType`; the `button` field is removed, since it was only used to detect the left-click dismissal that was removed. The message still records the pointer type so the focus that follows a mouse press can be told apart from focus that affirms the tooltip (keyboard, touch, or pen).
