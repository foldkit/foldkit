---
'@foldkit/oxlint-plugin': patch
---

Check Mount element usage in handlers returned by attached generator constructors and external alternatives passed to `Definition.toLayer`. Foldkit applies `Effect.gen` around attached generators. Service lookup during construction does not count as using the mounted element.
