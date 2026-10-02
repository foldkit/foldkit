---
'foldkit': patch
'@foldkit/devtools-mcp': patch
'@foldkit/vite-plugin': patch
'create-foldkit-app': patch
---

Protect Effect `Redacted` values across DevTools Model, Message, Command, Mount, init, and diff responses, including the Vite prebundle needed by consumers. Document the DevTools MCP trust boundary, the controls that disable dispatch or relay access, and why `excludeFromHistory` does not hide sensitive Model data.
