---
'foldkit': minor
---

Menu and Listbox now focus their items container via the `FocusItems` Command on `Opened`, not via an `OnMount` hook on the items container. The Mount path was a misclassification: the cause of the focus side effect is the `Opened` Message, not the existence of the items element. Returning a Command from `update` makes the cause explicit, lines up with how the rest of Foldkit handles "do X when Y happens" effects, and keeps mounts reserved for cases where the author needs the live `Element` handle.

The following exports are removed:

- `Menu.MenuFocusItemsOnMount`, `Menu.CompletedFocusItemsOnMount`
- `Listbox.ListboxFocusItemsOnMount`, `Listbox.CompletedFocusItemsOnMount`

Scene and Story tests that previously acknowledged the focus mount via `Scene.Mount.resolve(MenuFocusItemsOnMount, ...)` should drop the line. The items container no longer renders that Mount. Tests that dispatch `Opened` (or trigger it indirectly via `PressedPointerOnButton`) now receive a `FocusItems` Command and need `Story.Command.resolve(FocusItems, CompletedFocusItems())` to acknowledge it.
