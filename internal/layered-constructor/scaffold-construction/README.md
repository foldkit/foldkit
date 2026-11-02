# Generated application construction

`verify.mjs` invokes the real built scaffold generator and template build workflow. It creates a counter CSR app plus the SSG and SSR overlays, then typechecks, runs their existing Scene tests and builds each with Vite.

Run from the repository root with Node 22:

```sh
node packages/foldkit/node_modules/typescript/bin/tsc -b packages/create-foldkit-app/tsconfig.build.json
node internal/layered-constructor/scaffold-construction/verify.mjs
```

The gate uses `build-templates.mjs`'s supported release-manifest input with actual local package metadata. Generated projects use existing candidate dependency links, with one physical Effect runtime. It does not install packages, publish or replace the repository's packed CLI/SSR smoke gates. The final passing local result is `verification-XReNWo/results.json`; the earlier failed result preserves a caught SSR test import error.

The migrated active Vite fixtures also passed their source typecheck, 75 production-build tests and 72 SSR/hot-reload tests. Local-server tests required loopback access beyond the sandbox. The migrated VirtualList browser fixture passed its e2e source check and nine existing desktop Chromium geometry/cleanup tests, covering Self, Ancestor and Window scroll owners and supported row layouts.
