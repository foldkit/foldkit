---
'@foldkit/devtools-mcp': patch
---

Document that the MCP server only sees a runtime while the app is open in a browser tab. The browser bridge runs inside the app, so closing the tab removes the runtime from `foldkit_list_runtimes`.
