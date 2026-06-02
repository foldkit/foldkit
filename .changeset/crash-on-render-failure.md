---
'foldkit': minor
---

Surface render failures as the crash view instead of silently freezing the DOM.

A view that throws (for example a Schema constructor rejecting its input while building a VNode) ran inside the render loop fiber, which had no error path. The fiber died and the DOM stayed at the last successful render, so the failure was swallowed: no crash screen, and the app appeared stuck on its last good frame. Update failures already routed to the crash view. Render failures now do too, as do failures during the initial render.

**Breaking:** `CrashContext.message` is now `Option<Message>` instead of `Message`, because a crash during the initial render has no triggering Message. Update `crash.view` / `crash.report` handlers that read `message` to unwrap the `Option` (for example `Option.getOrUndefined(message)`).
