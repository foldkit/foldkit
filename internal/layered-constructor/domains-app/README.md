# Foldkit Domains: complete Layered migration

This isolated copy migrates the complete existing Domains application to Foldkit's experimental typed builders and Layer-owned Block construction. The original application at `/Users/devinjameson/Repos/foldkit-domains` is unchanged. Its commit and file hashes are recorded in [provenance/source.json](provenance/source.json).

The app remains an unofficial recreation of the Vercel Domains interaction, with deterministic sample prices and availability, no registrar requests, and no purchases or reservations. This copy has not been deployed.

The migration preserves URL synchronization, debounced and cached requests, progressive loading, virtualization, filters, sorting, cart behavior, SSR, hydration, DevTools, and accessibility. Original Stories, Scenes, transport tests, backend tests, and browser regressions remain in place.

## Run locally

Requires Node.js 24.11.1 or newer, the original app's installed dependencies, and built packages in this isolated Foldkit checkout. Setup only links existing dependencies; it does not install or modify the original project.

```sh
node setup-local.mjs
node verify.mjs
node node_modules/vite/bin/vite.js --host 127.0.0.1
```

Use `FOLDKIT_DOMAINS_SOURCE=/path/to/foldkit-domains node setup-local.mjs` if the original app is elsewhere. The local app, Foldkit, UI, and DevTools use one physical Effect 4.1.0 runtime. Infrastructure tooling is retained separately with its original dependencies; verification performs no deployment.

Run browser checks with `node verify.mjs --browser`. They start their own local Workerd server on port 5180 and refuse to reuse an existing server. Browser binaries must already be installed. Sandbox environments must permit loopback listeners and browser processes.

Do not run `pnpm install` against this spike. Its unpublished package dependencies are local paths, and there is no replacement package lock. The original published-package manifest, lockfile, and UI patch remain under `provenance/` and `patches/` for comparison.

## What changed

- [definition.ts](src/client/definition.ts) establishes the same Model and Message contracts through `Layered.makeDefinition`.
- [composition.ts](src/client/composition.ts) retains static Bindings, policies, deferred child initialization, and graph-aware builders.
- [children.ts](src/client/children.ts) adapts the existing Query and UI Blocks once with `fromBlock`; their implementations are retained.
- [block.ts](src/client/block.ts) yields eight typed Bindings and returns the independently authored init, update, view, children, and handler Layer through `ApplicationDefinition.makeBlock`.
- Original root Story and Scene calls use the Block-aware testing entry points, with awaited Effects and deferred `Story.messageIn` for raw child delivery. Shared ordinary test Steps stay reusable.

The search algorithms, domain Schemas, Query policies, RPC implementation, reusable parent Steps, and view implementation remain unchanged. The graph constructor needs no `DomainsClient`; the actual handler Layer and Program still require it. [checks/consumer.ts](checks/consumer.ts) verifies those exact channels and rejected combinations without application casts or a handwritten public contract.

The full app exposed symbolic dynamic initialization and Story child-delivery gaps, plus two declaration name-reachability gaps in Query/Listbox. The framework fixes preserve the original application expressions. The original VirtualList resize/scroll patches are incorporated in the isolated UI source rather than applied twice.

## Explore the project

- [Architecture](docs/architecture.md): code map, search flow, caching, hydration, and DevTools.
- [Testing](docs/testing.md): commands, regression invariants, and browser coverage.
- [Deployment](docs/deployment.md): local production builds, Cloudflare through Alchemy, and social assets.
- [Framework preview notes](docs/framework-preview.md): local packages, preserved provenance, and integration ownership.

Verification results are written to `results.json`; emitted declarations and a copied-package external consumer are generated under `declarations/` and `.relocated/`. This is a correctness and consumer ergonomics proof, not a compiler or rendering performance benchmark.

## License

[MIT](LICENSE)
