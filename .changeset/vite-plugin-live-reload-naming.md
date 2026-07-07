---
'@foldkit/vite-plugin': patch
---

Describe the plugin as state-preserving live reload rather than hot module reloading. The Vite plugin `name` is now `foldkit`, its log prefixes are `[foldkit:preserve]`, and the npm description and keywords no longer claim HMR. It imports Foldkit's renamed `model-preservation` protocol.
