---
'foldkit': minor
---

Add `isDocumentVisible` to every slow-phase context passed to `slow.onSlow`. Browsers throttle and deschedule hidden documents, so an update, view, patch, or Subscription dependency extraction that runs in a background tab can report a duration far above its real cost. Reporters can now separate those measurements from work that held the main thread while the user was looking. The default `console.warn` also notes when the document was hidden. Budgets, measured phases, and which phases report are unchanged.
