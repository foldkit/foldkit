# Packed application adoption

Run from the repository root with the supported Node and package-manager
versions:

```sh
node scripts/check-packed-ssr-consumer.ts
```

The November 1 verification passed after a normal clean build of all seven
packages, including the validation type-contract split. The packed project was
installed outside the monorepo without source aliases or workspace overrides.

Verified:

- Strict npm peers and exact Effect, platform-browser, platform-node and
  platform-node-shared versions, all 4.1.0.
- One physical Effect installation shared by 12 package and workspace
  resolutions, plus a valid `npm ls` dependency tree.
- Public entrypoints, declaration emission, inferred Element and Document
  Programs, and an npm workspace sharing a Model Schema.
- The Vite development relay and two production client/SSR builds.
- Installed UI and Markdown server rendering, followed by the existing default
  Chromium hydration, DOM, CSP, malformed/stale handoff refusal, top-layer and
  lifecycle checks.
- Removal of all temporary consumer files and tarballs, with port 5199 free.

The driver selects the exact platform-node floors from the published package
dependency declarations. Its optional exact version arguments can test another
supported set. This keeps the minimum-version check deterministic when a newer
platform patch requires a newer Effect patch. Published ranges and strict peer
resolution are unchanged.

The original checks exposed two failures before their fixes: platform patch
selection conflicted with the pinned Effect floor, and an inferred Program type
could not be named from the public barrel. Both failures and the final passing
run are retained locally under `verification/`, along with tarball hashes.
The Program type regression also has a source-free removal control in
`../emission-boundary/verify-program.mjs`.

This verifies the packed construction API. It does not publish packages or
establish every browser or supported dependency-version combination.

## Fresh canonical rerun

The run at `verification/fresh-20261102T031453Z` passed against the final canonical core/UI build using Node 22.22.3 and the existing default Chromium scope. The devtools overlay artifact was older than its source, so its normal package build ran first. The other six package artifacts were already current; the consumer driver then used `--skip-build` to preserve the concurrent adoption verifier's frozen artifacts.

`receipt.json` records all seven package distribution hashes and tarball hashes. Every distribution tree stayed unchanged during the gate, including all core/UI JavaScript. Strict peers, the four exact 4.1.0 dependency versions, one physical Effect runtime, source-free TypeScript checks, the npm workspace, dev relay, production SSR, hydration/refusal behavior, and cleanup passed. The temporary project and seven tarballs were removed, and port 5199 was free afterward.

The preceding sandbox-only attempt passed installation and dependency checks but could not bind its loopback listener (`EPERM`). The same gate passed after local server/browser execution was allowed; no consumer or production source was changed to bypass that failure.

## Cached-builder snapshot

The subsequent `verification/fresh-20261102T034408Z` run passed the same complete default gate after the final cached view-builder fix. It used the fresh canonical core build and current six companion packages with `--skip-build`; no package was rebuilt during this verification. All seven distribution trees remained unchanged, seven tarball hashes were recorded, temporary consumers and tarballs were removed, and port 5199 was free afterward. The core JavaScript difference from the preceding packed run was limited to `experimental/constructed/runtime.js`. The older packed run predates the final Binding union type correction, so its `block/public.d.ts` and `experimental/constructed/bindingContract.d.ts` also differ; adapter-only declaration identity was checked separately against the implementation agent's pre-adapter build.

## Review-fix snapshot

`verification/fresh-20261102T042258Z` passed the complete existing packed gate after the exact Definition-source and family input-configuration fixes. It used the coordinated final core/UI artifacts and current companion packages with `--skip-build`. Every distribution tree stayed unchanged while the gate ran. All seven tarballs and the temporary consumer were removed, and port 5199 was free. This run does not change the dependency-advisory or external-review status.
