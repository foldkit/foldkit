---
'create-foldkit-app': patch
---

Use a precise optimizeDeps entry point (src/main.ts) so Vite's dependency scanner never crawls into the repos/ submodule.
