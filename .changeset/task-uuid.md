---
'foldkit': minor
---

Add `Task.uuid`, a primitive that generates an RFC 4122 version 4 UUID via `crypto.randomUUID()`. Use it in Commands that need stable identifiers without threading `crypto` calls through consumer code.
