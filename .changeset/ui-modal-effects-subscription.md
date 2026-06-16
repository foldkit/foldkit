---
'@foldkit/ui': minor
---

Own modal scroll lock and background inert via a Subscription for Dialog, Popover, Menu, Combobox, and Listbox.

Previously these effects were applied by `LockScroll`, `UnlockScroll`, `InertOthers`, and `RestoreInert` Commands dispatched from `update` on open and close Messages. The release was tied to a close Message, so navigating away from a route that removed an open modal overlay without closing it first stranded page scroll (`overflow:hidden` on the document element survives the route change).

Each component now exposes a `subscriptions` export whose lifetime is gated on a Model condition: the component being open in modal mode (`isOpen && isModal`), or being visible for the always-modal Dialog. While the condition holds, the subscription locks page scroll and inerts the background; when it stops holding (an explicit close, or the component's Model being removed, for example on a route change), it releases both. Because the lifetime is the Model condition rather than a close Message or the panel element's DOM presence, the effects can no longer strand, and they are replay-safe under DevTools time-travel (re-rendering a past view never re-fires a Subscription).

Breaking: consumers that use these components in modal mode must wire the component's `subscriptions` into their app's subscriptions with `Subscription.lift`, the same way `DragAndDrop`, `Slider`, and `VirtualList` subscriptions are already wired. `LockScroll`, `UnlockScroll`, `InertOthers`, `RestoreInert` and their `Completed*` Messages are no longer exported from Popover, Menu, Combobox, or Listbox. Non-modal usage and all rendered output are unchanged.
