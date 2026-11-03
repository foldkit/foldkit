---
'foldkit': patch
---

Keep extracted Definition Step helpers, child Binding and Composition factories, and composed update builders nameable in downstream TypeScript declarations. Split modules can export destructured helpers, including OutMessage Steps and Map Bindings, without adding application annotations under TypeScript 6. The additional type-only names preserve the existing native factory exports and do not change runtime behavior.
