---
'@foldkit/devtools-mcp': patch
---

Bundle the published `foldkit-devtools-mcp` bin at build time so `dist/server.js` inlines `effect`, the Foldkit devtools protocol, the MCP SDK, and `ws`. The bin now runs standalone under `npx` with no peer dependency resolution, so `npx @foldkit/devtools-mcp init` works without installing the package as a devDependency.
