---
'@foldkit/ui': minor
---

Add opt-in swipe-to-dismiss to `Toast`. Pass `swipeToDismiss` to `Toast.init` (`{}` for the default 80px threshold, `{ threshold }` to tune it); without it the view attaches no pointer handler and the swipe Messages are no-ops, so existing Toasts never enter a drag they cannot finish. While dragging, entries follow the pointer through the `translate` property (which composes with `transform` leave animations) and `data-swipe="move"`. A release past the threshold holds the offset behind `data-swipe="settling"` through the leave animation before `DismissedToast` fires, while a release below the threshold (or `Escape`) settles back and reschedules the auto-dismiss timer. Wire `Toast.subscriptions` at the app root for pointer tracking, and read offsets in custom renderers with `Toast.swipeOffsetForEntry`.
