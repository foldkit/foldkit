---
'foldkit': patch
---

Annotate `File.File` with a JSON Schema so apps that include user-selected files in a Message keep MCP dispatch validation working. `File.File` is `S.instanceOf(globalThis.File)`, which has no default JSON Schema and previously caused `JSONSchema.make` to throw on the entire Message graph. The annotation describes the field as a non-transferable object so the rest of the Message stays validatable.
