---
'@foldkit/oxlint-plugin': patch
---

Check Mount element usage in handlers returned by attached constructor Effects and external alternatives passed to `Definition.toLayer`. Service lookup during construction does not count as using the mounted element.
