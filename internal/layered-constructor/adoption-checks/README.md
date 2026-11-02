# Application adoption checks

`verify-apps.mjs` checks all 35 example projects and the Typing Game's shared, client, and server packages with Node 22. It uses each package's existing typecheck and build scripts. Projects without a build script use their existing Vite build. SSR and SSG projects retain their normal bundling, server-build, and prerender steps.

```sh
node internal/layered-constructor/adoption-checks/verify-apps.mjs source
node internal/layered-constructor/adoption-checks/verify-apps.mjs build
node internal/layered-constructor/adoption-checks/verify-apps.mjs test
```

Optional trailing arguments select project names or repository-relative package paths. Logs and a coverage matrix are written under ignored `verification/`, with `latest-source.json`, `latest-build.json`, and `latest-test.json` pointing to the latest run. Every row records its command, result, source hash, and whether source changed while the command ran. Package dependencies and build artifacts must already be current. Run with the repository's pinned pnpm on `PATH`, or choose its executable with `FOLDKIT_VERIFY_PNPM`.

The initial adoption sweep passed all 38 production builds. Source initially passed 37 projects; the UI showcase exposed extracted callback annotations restricted to local Messages instead of their builder's dispatch contract. Those callbacks now derive the exact type through `Html.MessageOf<UiViewBuilder>`, and the showcase's source, lint, 13 tests, and production build pass. No compiler fixtures or budgets were changed.

The Pixel Art comparison benchmark now acquires the actual Application Block in `Story.withBlock`, captures its update once before the timing loops, and initializes the real child Models. The original warmups, operations, reducer baseline, and timing loops remain. Its existing benchmark test passes through `vitest.bench.config.ts`; this verifies the migrated harness without making a performance claim.

The source inventory found no remaining active `prepareBlock`, `Block.assemble`, or `FromAssembly` application completion in examples or Typing Game. Native framework regression fixtures, compiler workloads, frozen research inputs, and historical release content remain separate controls.

Test mode executes each package's declared `test` script through pnpm. A package
without that script is recorded as skipped with its manifest reason; the runner
does not invent a test command or silently exclude a package. The 38-package
inventory has 35 test scripts and three absent scripts: `examples/ssg`,
`packages/typing-game/shared`, and `packages/typing-game/server`.

API Cache Query deliberately selects `Query.layer` and `Tabs.layer` in its
root `AppLayer`, supplied at Program and test entry. This is ordinary Layer
composition: construction providers can be selected at the application boundary.
Most other examples close their child implementation requirements in `block.ts`.
The difference does not change child Models or handler ownership.

The complete manifest test sweep passed with Node 22.22.3 and pnpm 11.8.0 in
`verification/test-zatwC7/results.json`: 35 scripts, 716 passing tests, zero
failures or source changes, and exactly the three manifest-based skips above.
This runs the existing tests; it does not add coverage solely for the migration.

## Final cached-builder rerun

After the rendering adapter fix, the unchanged matrix passed again in `verification/test-ufHH00/results.json`: all 38 packages were inventoried, all 35 declared test scripts passed with 720 tests, and the same three packages had no test script. No application source changed during the run. Node 22.22.3 and the pinned pnpm shim were used; no extra tests or build steps were substituted for package scripts.

## Review-fix rerun

After exact Definition-source authentication and family input-configuration validation were added, `verification/test-eLbwgo/results.json` passed the same unchanged 38-package matrix: 35 scripts, 720 tests, three manifest-based skips, and no source changes. The run used the lead's coordinated post-review core/UI build.
