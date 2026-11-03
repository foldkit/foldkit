# Framework preview notes

This isolated copy exercises the experimental Layered authoring API against the complete existing Domains application. It consumes built public package entry points from the enclosing Foldkit checkout.

## Local packages

Run `node setup-local.mjs` to link the built local Foldkit, UI, DevTools, MCP, Vite plugin, and lint plugin packages. It reuses other installed dependencies from the read-only original app. Application packages share Effect 4.1.0. No package installation or remote service is part of setup.

The original package manifest, workspace settings, lockfile, and README are retained in `provenance/`. `provenance/source.json` records the original commit and hashes. The infrastructure source and its original installed dependencies are retained separately; this proof does not run Alchemy or deploy anything.

The new app manifest names local unpublished package paths. There is no new installation lockfile: use the setup script, then direct Node tool commands or `npm run` scripts. pnpm 12 may automatically install before running a script and should not be used for this spike.

## Development rendering

Development uses a shared build identity across client and SSR environments, preserving the original preview workaround. The Vite plugin refreshes the SSR module graph during development updates, and the server entry disposes its RPC handler before reevaluation.

## Framework integration

The original `repos/foldkit` subtree is excluded from this copy. Framework imports resolve through public package exports. `children.ts` adapts the existing Query and UI Blocks; the app's typed Composition, init, update, view, and extracted transitions retain their existing module boundaries.

The tracked original UI patch remains in `patches/` for provenance. Its VirtualList fixes are included in the isolated UI implementation: retain signed offsets above the list, admit native scroll movement during a pending row-layout update, and measure a changed container width before observing its scroll. Browser regressions protect resize anchoring, sorting without page jumps, and returning to the first catalog row with Home. The patch is not applied again to the local package.

`node verify.mjs` checks app types, exact public requirements, all original unit/Story/Scene/execution tests, declaration emission and a relocated copied-package consumer, and production SSR/prerender output. `node verify.mjs --browser` also runs the production browser regressions. Results are recorded in `results.json`.

The graph Layer has no external Service requirement. The Query handler retains `DomainsClient` until normal handler/Program provisioning. Tests construct the graph without inventing a Service provider and resolve Commands as before.
