---
'@foldkit/ui': minor
---

Add `Toast.test.drainEntry` for Story tests. Showing a toast emits a multi-step animation and dismiss lifecycle, and a Story test must resolve every emitted Command or it fails on leftover Commands. The helper builds the `Story.Command.resolveAll` step that drains a single entry end to end: enter animation, settle, auto-dismiss, exit animation, settle. Each step resolves with the child's raw result Message, so `resolveAll` replays the matched Command's own wrapping and a parent that embeds the toast Submodel drains the same way. The lifecycle knowledge now lives in one place instead of being hand-rolled in each test.
