---
'foldkit': patch
---

Make vite-plugin-foldkit optional for local development. The runtime now falls back to a cold start with a helpful console warning if the plugin is missing, instead of silently showing a blank screen.
