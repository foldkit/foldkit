---
'foldkit': patch
'@foldkit/vite-plugin': patch
---

Keep hydration and DevTools recording code out of production bundles that only run a fresh client application. The Vite plugin registers DevTools recording for development even when no overlay package is installed.
