# Stable constructed view builders

`constructImplementation` now creates one adapter cache for its acquired graph. An ordinary object copies the native Html builder's element, attribute, keyed and empty members; only `block` resolves symbolic relationships against that graph. The cache records both native-to-adapted and adapted-to-itself entries so ordinary views and nested input-bearing helpers share a stable builder without adapter chains. Separate acquisitions retain separate caches and child implementations.

No public type, graph contract, Message routing, lazy-cache rule or compiler budget changed.

## Verification

Commands from the repository, using Node 22.22.3:

```sh
cd packages/foldkit
node node_modules/vitest/vitest.mjs run --config vitest.config.ts src/experimental/contracted/builderReuse.test.ts src/experimental/contracted/viewComposition.test.ts
cd ../..
node packages/foldkit/node_modules/typescript/bin/tsc -p packages/foldkit/tsconfig.json --noEmit --pretty false
node internal/layered-constructor/view-composition/verify-builder-reuse.mjs
```

The focused suites pass all nine tests, and the full core source check passes. Scoped formatting, standard lint and Effect lint also pass. No canonical core/UI build was run by this agent.

Before the fix, all three new tests failed: an unchanged lazy helper ran four times instead of once, the extracted input-bearing helper saw eight builders instead of one, and two acquisitions saw six builders instead of two. Logs are preserved at `/tmp/foldkit-builder-reuse-before.log` and `/tmp/foldkit-builder-reuse-after.log`.

The runnable verifier copies package source and mutates only that copy. Its final receipt is `verification/builder-reuse-yJEmWv/results.json`:

- Baseline: all three tests pass.
- Original per-render Proxy allocation: the lazy helper count fails, four versus one.
- Incorrect process-wide cache: the second acquisition reuses the first graph's child Binding, and the native view registration guard rejects it.
- Restored copy: all three tests pass.

The verifier checks the canonical runtime source hash afterward. It does not rebuild or alter canonical source or dist.
