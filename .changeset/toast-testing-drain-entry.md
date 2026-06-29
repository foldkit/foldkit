---
'@foldkit/ui': minor
---

Add `Toast.testing.drainEntry` for Story tests. Showing a toast emits a
multi-step animation and dismiss lifecycle, and a Story test must resolve every
emitted Command or it fails on leftover Commands. The helper builds the
`Story.Command.resolveAll` step that drains a single entry end to end: enter
animation, settle, auto-dismiss, exit animation, settle. Pass the entry's id and
the `toParentMessage` wrap the parent applies when it embeds the toast Submodel.
The lifecycle knowledge now lives in one place instead of being hand-rolled in
each test.
