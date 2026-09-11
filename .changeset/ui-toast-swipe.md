---
'@foldkit/ui': minor
---

Add opt-in swipe-to-dismiss to `Toast`. Pass `swipeToDismiss` to `Toast.init` (`{}` for the default 80px threshold, `{ threshold }` to tune it); without it the view attaches no pointer handler and the swipe Messages are no-ops, so existing Toasts never enter a drag they cannot finish. Each Entry owns its swipe state and settle version, allowing one Toast to settle or leave while another is dragged. A drag records its initiating `pointerId`, so unrelated touches cannot move, release, or cancel it. While dragging, entries follow the pointer through the `translate` property (which composes with `transform` leave animations) and `data-swipe="move"`. A release past the threshold holds the offset behind `data-swipe="settling"` through the leave animation before `DismissedToast` fires, while a release below the threshold (or `Escape`) settles back and reschedules the auto-dismiss timer. Wire `Toast.subscriptions` at the app root for pointer tracking, and read offsets in custom renderers with `Toast.swipeOffset(entry.swipeState)`.

This changes the public Toast Model and Entry schemas. Consumers that construct them directly must add `maybeSwipeThreshold: Option.none()` to disabled Models and add `swipeState: SwipeState.Idle()` plus `swipeVersion: 0` to Entries. Consumers that create state through `Toast.init` and `Toast.show` require no migration.
