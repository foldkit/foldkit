---
'@foldkit/ui': minor
---

Own modal scroll lock and background inert via the panel Mount for Dialog, Popover, Menu, Combobox, and Listbox.

Previously these effects were applied by `LockScroll`, `UnlockScroll`, `InertOthers`, and `RestoreInert` Commands dispatched from `update` on open and close Messages. They are now owned by the rendered panel's lifetime. Each overlay's panel Mount (`AnchorPopover`, `AnchorMenu`, `AnchorCombobox`, `AnchorListbox`, and a dedicated `LockScroll` Mount on `Dialog`) acquires the lock and inert when the panel mounts and releases them when it unmounts. Because the lifetime is the rendered panel rather than an explicit close Message, navigating away from a route that removes an open modal overlay without closing it first now releases page scroll and inert instead of stranding them.

For animated overlays this also means the lock and inert now release when the leave animation finishes and the panel unmounts, rather than immediately on the close Message.

Breaking: `LockScroll`, `UnlockScroll`, `InertOthers`, `RestoreInert` and their `Completed*` Messages are no longer exported from Popover, Menu, Combobox, or Listbox. Dialog gains a `LockScroll` Mount and a `CompletedLockScroll` Message. The `isModal` option and all rendered output are unchanged, so consumers that drive these components through their public `view`, `update`, and `init` need no changes.
