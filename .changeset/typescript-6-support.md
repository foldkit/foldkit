---
'foldkit': patch
'@foldkit/vite-plugin': patch
'create-foldkit-app': patch
---

Adopt TypeScript 6.0 for internal tooling. Foldkit, `@foldkit/vite-plugin`, and `create-foldkit-app` now build and typecheck against TypeScript 6.0.2. The published packages remain compatible with TypeScript 5.9 and later — downstream projects are free to stay on 5.x. Internal tsconfigs have migrated `moduleResolution` from the deprecated `node10` to `bundler` to silence TypeScript 6.0's deprecation error.
