---
'foldkit': patch
'create-foldkit-app': patch
---

Name application-authored transitions after their operation, without a `make` prefix or `Step` suffix. Apply this convention to reusable Steps and factories returning Steps, including local values, and update the scaffold guidance and API examples.

Framework authoring APIs and types such as `makeStep`, `makeFieldsStep`, `Update.Step`, and `Update.combineSteps` keep their names. This is an application naming convention and does not change execution or require a runtime migration.
