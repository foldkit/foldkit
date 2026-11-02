---
'@foldkit/devtools-mcp': patch
'create-foldkit-app': patch
---

Update the DevTools MCP server to MCP SDK 1.32.0 and refresh its compatible transitive dependencies to patched versions.

Move the scaffold package's build-only cleanup dependency to devDependencies so installing `create-foldkit-app` does not install its glob dependency graph.
