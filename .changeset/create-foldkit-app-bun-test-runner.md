---
'create-foldkit-app': minor
---

Add a `--test-runner` flag. `--test-runner bun`, together with `--package-manager bun`, scaffolds a project that runs its tests with `bun test` instead of Vitest:

- `bunfig.toml` preloads `src/bun-setup.ts`, which registers happy-dom globals with `@happy-dom/global-registrator` and the Scene matchers with `foldkit/test/bun`.
- The `test` script runs `bun test`, and test files import from `bun:test`.
- The project has no `vitest.config.ts` or `src/vitest-setup.ts`, and its devDependencies list `@happy-dom/global-registrator` and `@types/bun` instead of `vitest` and `happy-dom`.

The flag defaults to `vitest`, and the CLI does not prompt for it, so projects scaffolded without the flag are unchanged. The `map` and `pixel-art` examples reject `--test-runner bun`, because `map` uses `vi.hoisted` and `pixel-art` has Vitest `bench` benchmarks. `bun:test` provides neither.
