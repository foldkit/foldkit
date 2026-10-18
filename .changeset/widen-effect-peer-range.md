---
'foldkit': patch
'@foldkit/ui': patch
'@foldkit/devtools': patch
'@foldkit/devtools-mcp': patch
'@foldkit/markdown': patch
'@foldkit/node': patch
'@foldkit/vite-plugin': patch
---

Foldkit runtime packages now accept compatible Effect 4.x releases instead of requiring exactly 4.0.0. The Vite plugin and DevTools MCP require Effect 4.0.5 or later: the plugin's direct `@effect/platform-node` and `@effect/platform-node-shared` 4.0.5 dependencies require `effect ^4.0.5`, and the MCP integration tests exercise that plugin. The Vite plugin also uses the `Crypto.randomUUIDv4` API change tracked in #8935.
