---
'foldkit': minor
---

Add a `when` option to `Dom.scrollIntoViewIfNotVisible`. It selects the timing
gate: `'Paint'` (the default) waits for `Render.afterPaint` and keeps the
existing behavior, while `'Commit'` waits for `Render.afterCommit` so the
scroll lands in the same frame the DOM patch applies, before the browser
paints. Use `'Commit'` when the target is brought into view and scrolled by
the same Message, such as a menu opening, so it appears already scrolled
rather than visibly jumping.
