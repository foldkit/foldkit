---
'@foldkit/devtools-mcp': minor
---

Use Block terminology in DevTools Message paths. Serialized history entries expose `blockPath`, and serialized Commands expose `maybeBlockPath`, replacing `submodelPath` and `maybeSubmodelPath`. The overlay, runtime, and MCP tool descriptions use the same fields.

Require Foldkit 0.169.0 or newer so MCP decodes the current serialized protocol. Update the MCP server alongside the application's Foldkit packages. The relay registry's on-disk record shape is unchanged.
