---
'@foldkit/vite-plugin': patch
---

Skip full-reload for file changes outside the module graph (e.g. editor temp files, MCP tool logs) by checking the `modules` array before sending the reload signal.
