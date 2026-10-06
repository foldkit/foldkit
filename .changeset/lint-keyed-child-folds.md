---
'@foldkit/oxlint-plugin': patch
---

Recognize direct-field `Update.foldChildAt` boundaries and empty curried `toParentOutMessage` mappers. Direct-field inference requires `writeAt` to replace that field, avoiding false positives for keyed collection updates.
