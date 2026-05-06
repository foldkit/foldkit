---
'foldkit': patch
---

Fix DevTools time-travel polluting history with mount-derived Messages.

When DevTools renders a historical Model (e.g. via `jumpTo` or the timeline scrubber), Snabbdom inserts elements that may carry `OnMount` attributes. Until now, those mount Effects fired and their result Messages were dispatched into the live runtime, which recorded them as new history entries. The result: clicking through history caused new entries like `CompletedAnchorPopover` and `CompletedPortalPopoverBackdrop` to appear at the live end of history, polluting the timeline with replay-induced activity.

The fix routes the DevTools render through a no-op dispatch. Mount Effects still execute (so the rendered DOM looks correct: positioning, observer attachment, library setup are preserved), but their result Messages are silenced and no new history entries are produced. Cleanup behaviour is unchanged.

This is defense-in-depth alongside the convention that Mount Effects should only do replay-safe DOM measurement and manipulation. Convention is the primary mechanism; this fix is the safety net for misjudged Mounts.
