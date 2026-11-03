---
'foldkit': patch
---

Keep extracted Definition Step helpers and Composition update builders nameable in downstream TypeScript declarations. Split modules can export destructured helpers without adding application annotations, including under TypeScript 6. The additional type-only names do not change runtime behavior.
