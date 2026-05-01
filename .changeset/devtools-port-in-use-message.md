---
'@foldkit/vite-plugin': patch
---

Show a helpful error when the DevTools MCP port is already in use. Previously the relay logged a generic "failed to start" line with the raw `EADDRINUSE` error, which made it hard to tell why an agent could not connect to Foldkit DevTools via MCP. The plugin now explains that another Foldkit project is likely bound to the port, and suggests either stopping that project or setting a different `devToolsMcpPort` in vite config.

The success log was also moved into the WebSocket server's `listening` event, so "MCP relay listening on ..." no longer prints when the bind ultimately fails.
