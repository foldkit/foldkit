---
'foldkit': patch
---

Harden the DevTools WebSocket bridge against Message schemas whose JSON Schema generation throws. The bridge previously called `JSONSchema.make(schema)` directly, which propagated as an unhandled error when a schema (e.g. one containing `OptionFromSelf`) couldn't be converted. It now catches the failure, logs a warning, and continues without MCP dispatch validation rather than tearing down the bridge.

Annotate `Url`'s `port`, `search`, and `hash` fields with a JSON Schema for the `OptionFromSelf(String)` shape so apps that expose `Url` in their Message schema get a valid JSON Schema for MCP dispatch validation.
