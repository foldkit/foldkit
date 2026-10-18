---
'foldkit': patch
'@foldkit/ui': patch
'@foldkit/devtools': patch
'@foldkit/devtools-mcp': patch
'@foldkit/markdown': patch
'@foldkit/node': patch
'@foldkit/vite-plugin': patch
---

Foldkit runtime packages now accept compatible Effect 4.x releases instead of requiring exactly 4.0.0. The Vite plugin requires Effect 4.0.3 or later because that release changed `Crypto.randomUUIDv4` from an Effect value to a function. Its relay continues to use the platform Crypto service.
