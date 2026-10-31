---
'@foldkit/devtools-mcp': minor
---

Report Block instance paths in DevTools Message history. A Message sent to a child Block instance has the tag `BlockMessage`, and its serialized history entry exposes `blockPath`, the instance path from the root, where an instance created by `each` appears as its collection name followed by its key. Serialized Commands expose `maybeBlockPath`. These replace `submodelPath` and `maybeSubmodelPath`, which listed `Got*Message` wrapper tags. The overlay, runtime, and MCP tool descriptions use the same fields.

The `foldkit` peer floor rises to 0.169.0. Update the MCP server alongside the application's Foldkit packages. The relay registry's on-disk record shape is unchanged.
