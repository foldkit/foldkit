# Official actual-main / published-preview diagnostic plan

Prepared 2026-11-07. Do not run until the lead opens a quiet browser window.
This is a bounded diagnostic recipe, not a benchmark framework and not an
official timing batch.

## Frozen inputs

- Snapshot root:
  `/private/tmp/foldkit-record-release-rendering-xpwmm820`
- Artifact receipt: `final-artifact-receipt.json`, SHA-256
  `9e4713466acc76e4f063e257212f209bf8533828c92c36f6eab8cd49a9c2bbde`
- Actual main: commit `a471adb24d750ab9e8d8312edad53ff6f26d961b`
  through the legacy `Runtime.makeApplication` entry.
- Published preview source identity: published commit
  `54f8bcd443b4fd18952403a3d02e212abf872d58`; the retained release
  receipt's candidate source head is `1117a93316ff8111d402bffc995067476ec97983`.
  It enters through `ApplicationBlock`, its Layer, `Program.make`, and
  `Runtime.run`.
- Actual-main asset: `foldkit-main/dist/assets/index-DN9U5aN7.js`, 304,187
  bytes, SHA-256
  `d3e37e9f695531f98727dadc3ead8bddd4b0bdb93f52b64029880c3d7a78adb4`.
- Published-preview asset:
  `foldkit-preview-final/dist/assets/index-ZmDGH17y.js`, 475,519 bytes,
  SHA-256
  `445b31212df9efe25ce6e81fe60cb7a5dfc583c46fc098dd84de40e234e9d146`.
- Primary actual-main optimized asset:
  `foldkit-main-optimised/dist/assets/index.optimised-UkWhNSKN.js`, 306,590
  bytes, SHA-256
  `852eddbf31ec2d3274568f1f0d503dfeabc6e181c8d2361489b435b13ce14ded`.
- Primary published-preview optimized asset:
  `foldkit-preview-final-optimised/dist/assets/index.optimised-4XrqNWmx.js`,
  482,112 bytes, SHA-256
  `c6802c60c7eccbfb7bbd04f760bb0a9e8e7fc3db2f4945edcf880cca340036ce`.
- Exact actual-main optimized hidden-map twin:
  `/private/tmp/foldkit-unified-profile-20261104/maps-main/assets/index.optimised-UkWhNSKN.js`
  is byte-identical to the served official asset (`852eddbf...`); its map is
  `index.optimised-UkWhNSKN.js.map`, 4,496,443 bytes, SHA-256
  `9d632a69c71bc066080470498aa7eab3bd60388caf1e242dd07542e65bc8710a`.
- Exact preview hidden map:
  `/private/tmp/foldkit-bundle-invocation-controls-20261107/d_retargeted/internal/lustre-benchmark/dist-map/naive/assets/index-ZmDGH17y.js.map`,
  6,156,639 bytes, SHA-256
  `4ded625981064248a1f3ac38e980d563d3dcc1b94da34770cc06afc25dd41616`.
- Exact published-preview optimized hidden map is not currently retained and
  must be built from the accepted self-contained `d_retargeted` tree below.
- Exact main naive hidden map is not currently retained. The exact main map
  above is optimized and must not be used for the naive capture.
- Node executable:
  `/Users/devinjameson/.vite-plus/js_runtime/node/26.13.0/bin/node`, SHA-256
  `533bd644c5ae0e0ea3a80e433aad16b817447ccba1e1eea701875eac80cb75d4`.
- Chromium 153.0.8010.12 executable:
  `/Users/devinjameson/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
  SHA-256
  `8319963f6625accf51c0dd4f55091ceaf9f09ed39e7a52fed4fae12b2a6b668a`.

The capture script rehashes the receipt, unchanged driver, all four complete
slot directories, served JavaScript, and the exact executed Debugger script source
before accepting an observation. It also requires the final empty Todo list,
the input, cross-origin isolation, exactly 400 synchronous callbacks, exactly
400 animation-frame callbacks, and zero timeout/microtask/promise callbacks.

## Quiet-window execution

Run the ordinary sampled CPU capture first in a fresh Chromium process. It does
not enable precise coverage:

```sh
/Users/devinjameson/.vite-plus/js_runtime/node/26.13.0/bin/node \
  /private/tmp/foldkit-official-workcount-cpu-20261107/capture.mjs \
  cpu \
  /private/tmp/foldkit-official-workcount-cpu-20261107/cpu
```

After that process has closed its browser and server, run the exact call-count
capture in a second fresh Chromium process:

```sh
/Users/devinjameson/.vite-plus/js_runtime/node/26.13.0/bin/node \
  /private/tmp/foldkit-official-workcount-cpu-20261107/capture.mjs \
  coverage \
  /private/tmp/foldkit-official-workcount-cpu-20261107/coverage
```

Each invocation performs one full retained add-100 / toggle-100 / delete-100
run for four slots, ordered primary optimized main/preview and then secondary
naive main/preview, and owns/cleans one server and browser. A repeat is not
automatic. Repeat one balanced optimized pair only if a primary target is
absent from the CPU samples or the attribution is unstable; never repeat a
failed semantic/hash/count guard as valid evidence.

## Missing preview-optimized and main-naive maps

The optimized preview twin must preserve the same-runtime, same-package-root
invariant that made the naive map valid. Before its build, verify all four links
inside `/private/tmp/foldkit-bundle-invocation-controls-20261107/d_retargeted`
still resolve inside that same tree:

- `node_modules/foldkit` -> `packages/foldkit`
- `internal/lustre-benchmark/node_modules/@foldkit/vite-plugin` ->
  `packages/vite-plugin-foldkit`
- `internal/lustre-benchmark/node_modules/foldkit` -> `packages/foldkit`
- `packages/vite-plugin-foldkit/node_modules/foldkit` -> `packages/foldkit`

After local build/test activity stops and before browser capture, create the
optimized hidden-map twin:

```sh
cd /private/tmp/foldkit-bundle-invocation-controls-20261107/d_retargeted/internal/lustre-benchmark
env -u NODE_ENV -u VITE_USER_NODE_ENV -u MODE \
  BUILD_VARIANT=optimised CI=1 LANG=C.UTF-8 LC_ALL=C.UTF-8 NO_COLOR=1 \
  /Users/devinjameson/.vite-plus/js_runtime/node/26.13.0/bin/node \
  node_modules/vite/bin/vite.js build \
  --mode production \
  --sourcemap hidden \
  --outDir /private/tmp/foldkit-official-workcount-cpu-20261107/maps-preview-optimised
```

Accept it only if its JavaScript is exactly 482,112 bytes and SHA-256
`c6802c60c7eccbfb7bbd04f760bb0a9e8e7fc3db2f4945edcf880cca340036ce`.
Record the new map hash. A different hash, module count, or output name is a
failed preparation, not a replacement artifact.

In the same authorized map-build window, after the optimized twin, create one
naive hidden-map twin from the already source-verified actual-main snapshot
used by the prior exact optimized map:

```sh
cd /private/tmp/foldkit-unified-rendering-20261104/main/internal/lustre-benchmark
env -u NODE_ENV -u VITE_USER_NODE_ENV -u MODE -u BUILD_VARIANT \
  CI=1 LANG=C.UTF-8 LC_ALL=C.UTF-8 NO_COLOR=1 \
  /Users/devinjameson/.vite-plus/js_runtime/node/26.13.0/bin/node \
  node_modules/vite/bin/vite.js build \
  --mode production \
  --sourcemap hidden \
  --outDir /private/tmp/foldkit-official-workcount-cpu-20261107/maps-main-naive
```

Accept that map only if its emitted JavaScript is byte-identical to
`index-DN9U5aN7.js` above. Record the new map hash; do not rebuild or replace
the served official assets. The preview map is already exact and should be
reused without another build.

## Analysis contract

Treat optimized as the primary diagnosis because the robust official absolute
gap is approximately +100.7 ms there, versus +55.7 ms in naive. Naive is a
secondary architecture/control observation and cannot by itself explain the
optimized result.

Map the top function range in each precise-coverage `FunctionCoverage` row
back through the source-matched hidden map, then resolve the enclosing TypeScript
function from embedded `sourcesContent`. Report exact boot-inclusive call counts
for:

- the application update dispatcher and its exact Todo handlers;
- the application view (`view.optimised.ts` for the primary slots and
  `todo.ts` for naive);
- `renderSync` and `runRenderFrameBody` in `runtime/renderer.ts`;
- `patch` and `patchVnode` in `snabbdom/init.ts`.

Do not force structural equality between the application update owners. Main
calls `todo.update`; preview uses the Composition-produced dispatcher over
`updateHandlers`. Report both exact source owners and the shared handler total.
Likewise retain any preview-only Program/Block wrappers rather than assigning
their work to `todo.update`.

Use the CPU profiles only for descriptive source-matched self/inclusive sample
attribution. Reuse the decoder and enclosing-function logic from
`/private/tmp/foldkit-unified-profile-20261104/summarise-profiles.cjs`; do not
add a new decoder dependency. Inclusive rows overlap and must not be summed.
The prior November 4 profile covers actual main versus an earlier preview
candidate. Its actual-main optimized asset and map are exact matches and its
main samples remain context, but its earlier-preview samples are not
published-54 and must not be combined with these new samples.

## Span and trust boundary

Both CDP captures start before `window.runBenchmark` loads the app iframe and
stop after the unchanged runner resolves. They therefore include app boot,
idle waits, and the full workload. The harness's callback-time measurement
resets after boot, but CDP does not expose that internal reset as a phase hook.
No exact boot/workload CPU or function-count subtraction is claimed. Adding a
hook would be source instrumentation and is deliberately excluded.

The retained `run.mjs` supplies no phase or boundary callback. `runner.html`
has only private `resetMeasurements()` calls and the existing per-callback
`lustre-benchmark:measurement` events; it exposes no event at the second reset
between boot and workload. Those events support the returned bucket counts but
cannot authenticate an exact CDP phase split.

Precise coverage changes V8 optimization and can stretch frame duration. Its
elapsed times and CPU shape are invalid. Its call counts remain useful because
the runner serializes every action behind two requestAnimationFrame waits and a
final quiet-frame gate; it has no fixed wall-time frame budget. Accept counts
only when the unchanged callback counts and DOM/hash guards pass. If a target
count differs, describe it as different work observed under the coverage run,
not automatically as the cause of the official uninstrumented timing gap.

The main/preview pair is a valid end-to-end architecture comparison. Because
it changes both assembly APIs and runtime source, it cannot isolate a Block
graph phase or prove per-render registration. A count of one is consistent
with boot-only work; a count aligned with render/update calls is a reached-cost
lead, not phase proof. Any optimization selected from snapshot 54 still needs
the same diagnostic or a focused matched control on the current `3f` source.
