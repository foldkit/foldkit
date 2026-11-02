---
'create-foldkit-app': patch
---

Document update handler naming in the scaffold's `FOLDKIT.md`. Extract a substantial single-Message handler into a function named `handle<MessageTag>` and pass it as the update record value. Name a reusable Model-first transition with a descriptive `Step` suffix, such as `refreshStep`, and sequence pure Steps with `Update.combineSteps`.
