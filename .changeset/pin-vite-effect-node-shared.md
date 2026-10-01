---
'@foldkit/vite-plugin': patch
---

Pin `@effect/platform-node-shared` to `4.0.0-rc.117` alongside `@effect/platform-node`. Fresh npm installs could otherwise select the stable `4.0.0` shared package, whose Effect peer dependency conflicts with Foldkit's RC117 pin, and stall with repeated peer dependency warnings. The plugin now supplies the compatible version for consuming apps, including the SSG playground.
