# Issue 1737: one-import boundary experiment

Importing the existing ThemeMenu module directly did not make completed-root editor requests responsive. Cold and post-edit requests still took several seconds. The third candidate diagnostics process reached the unchanged 22-second lifetime limit before error clearing returned.

The candidate has been reverted. This directory preserves a failed experiment for [issue #1737](https://github.com/foldkit/foldkit/issues/1737), not a latency fix or a framework API proposal.

## Base, target, and candidate

- Exact source base: [`9a5f9307cb4af2aca8a1e28bbf7b21cf64e5f87c`](https://github.com/foldkit/foldkit/commit/9a5f9307cb4af2aca8a1e28bbf7b21cf64e5f87c).
- Draft PR target: `codex/preview-followups`, not `main`. The commit above, rather than a moving branch tip, defines the experiment.
- Arm A: that base, its frozen dependency install, completed public-package build, and generated Website API inputs.
- Arm B: the same setup plus [direct-theme-menu.patch](./direct-theme-menu.patch). The patch changes one import in `packages/website/src/composition/composition.ts`:

```diff
-import { ThemeMenu } from '../view'
+import * as ThemeMenu from '../view/themeMenu'
```

The base already includes the early canonical Model Schema workaround. These measurements use native TypeScript **7.0.2**, not the issue's separate 7.1 beta compiler patch or its beta-built declarations.

### Hypothesis and source inspection

The original import enters the [view barrel](../../packages/website/src/view/index.ts), which also exports [themeSelector.ts](../../packages/website/src/view/themeSelector.ts). That module imports `ThemeMenuBinding` from the [composition barrel](../../packages/website/src/composition/index.ts), which re-exports it from `composition/composition.ts`. The candidate bypasses this particular route back into composition:

```text
composition/composition.ts
  -> view/index.ts
  -> view/themeSelector.ts
  -> composition/index.ts
  -> composition/composition.ts
```

The hypothesis was that avoiding the view barrel at this import would reduce the inference work demanded by completed-root queries. The measurements did not establish a useful improvement. Removing this import route does not establish that the complete application dependency graph is acyclic, or identify which compiler work causes the remaining delay.

Both imports access `ThemeMenuBlock` from [view/themeMenu.ts](../../packages/website/src/view/themeMenu.ts), where the existing object is created once:

```ts
import { Menu } from '@foldkit/ui'

import { type ThemePreference } from '../themePreference'

export const ThemeMenuBlock = Menu.create<typeof ThemePreference.Type>()
```

The candidate does not create another Menu Block or Schema. The parent [Model](../../packages/website/src/model.ts) already imports this same `ThemeMenuBlock` directly and uses `ThemeMenuBlock.Model`. `ThemeMenuBinding` still receives `ThemeMenu.ThemeMenuBlock`, with the same initialization and OutMessage fold. This is a source-inspection argument about the existing exports, not an exhaustive semantic-equivalence proof or a separately executed runtime object-identity assertion.

### Difference from earlier experiments

The [pinned expanded ledger](https://gist.githubusercontent.com/devinjameson/c56b8fb3da61ec821bb6a1456b2596ee/raw/bb40dabbe5b3a0afe2e4292df52515ee7354a8b1/scope-experiment-ledger.md) records changes to assembly signatures, Schema constraints, completed contracts, independent graph channels, explicit declaration boundaries, and intentionally unsafe validation cuts. This candidate changes none of those encodings. It tests one application import path to an already existing module.

No public API tradeoff is adopted. There is no consumer migration, new author annotation, cast, widened contract, erased requirement, deferred validation, or weakened runtime check. Framework source and built declarations are unchanged across the measured arms. The one application import change is retained only as a replayable patch, not as a shipped change.

## Existing split-file consumer

The consumer is the actual Website application, not a mock or a smaller substitute. Its completed root remains the existing assembly in [packages/website/src/block.ts](../../packages/website/src/block.ts):

```ts
import { ApplicationComposition } from './composition'
import { init } from './init'
import { EffectsLayer } from './layer'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view/view'

export const ApplicationBlock = ApplicationComposition.assembleBlock({
  init,
  update,
  view,
  subscriptions,
  EffectsLayer,
})
```

The relevant files and contracts are:

| Existing source                                                                     | Symbols and role                                                                                                                                                             |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [composition/composition.ts](../../packages/website/src/composition/composition.ts) | `ApplicationComposition`, `ThemeMenuBinding`, and `UiPagesBinding`: the real child graph, initialization adapters, and OutMessage policies.                                  |
| [model.ts](../../packages/website/src/model.ts)                                     | `Model`: the parent Schema uses canonical child Schemas, including `Ui.Model`, and the existing `ThemeMenuBlock.Model`.                                                      |
| [page/ui/composition.ts](../../packages/website/src/page/ui/composition.ts)         | `UiComposition`: the existing nested UI graph, including optional, supplied-view, and interactive component wiring, rather than a generic replacement.                       |
| [entry.ts](../../packages/website/src/entry.ts)                                     | `program`: `Program.make` consumes `ApplicationBlock`, uses its exact `ClickedLink` and `ChangedUrl` constructors, provides `ApplicationLayer`, and calls `Runtime.hydrate`. |
| [entry.server.ts](../../packages/website/src/entry.server.ts)                       | `renderPage`: `Server.renderToString` consumes the same completed `ApplicationBlock` with `Flags`.                                                                           |
| [layer.ts](../../packages/website/src/layer.ts)                                     | `EffectsLayer`: the actual Command, playground, and Subscription handlers.                                                                                                   |
| [services.ts](../../packages/website/src/services.ts)                               | `ApplicationLayer`: the actual browser Service providers.                                                                                                                    |

The archived `contracts/tsconfig.website.json` only extends `../../../packages/website/tsconfig.json`. It preserves the complete Website project and its compiler options; it does not copy consumer code, narrow the include set, or introduce a synthetic wiring fixture. The source references above describe the pinned base; the final draft leaves those application files unchanged.

## Measurement protocol

The observed host was macOS 15.7, build `24G222`, on an arm64 `MacBookPro18,2` with 10 CPU cores and 64 GiB RAM. Node was `v22.23.3`; pnpm was `11.8.0`. The installed wrapper, native package, and LSP server reported TypeScript `7.0.2`, compiler Git head `2bd066d87f5bafd315be9f40889d0a60b9e58e0b`.

The executed identities were:

| Artifact                              | SHA-256                                                            |
| ------------------------------------- | ------------------------------------------------------------------ |
| Original completion/diagnostics probe | `1491ea5fe44f546a4adfb74126a42ec866e7235a3c62f25dead66a6b75cc1751` |
| Extended actual-Model-hover probe     | `3ccab68a8d5cac56adf8c01adcea22764a7b3de57d4a58889bcb52594cf4f5ad` |
| Unchanged memory guard                | `f82396c66ef418574707f23e1056609be22b492308436d817d0102daefaa9eaf` |
| Actual native compiler executable     | `a82f731365ad69d5c4c15f5e18fba4584bf3b7b839960172a76c3462b5114bf2` |
| Wrapper's vendored JSON-RPC client    | `bcbe8e0f8693a2e3effb4a890a70c331153b616a4a2f88406dcffd842364a2e6` |

All matched probes ran serially in this order:

```text
A1 completion, hover, diagnostics
A2 completion, hover, diagnostics
B1 completion, hover, diagnostics
B2 completion, hover, diagnostics
A3 completion, hover, diagnostics
B3 completion, hover, diagnostics
```

Each mode starts a fresh owned native LSP process. Completion and hover request cold, immediately warm, and post-edit results. Their post-edit operation appends a newline through `didChange`; a subsequent hover on an inserted `1737` literal verifies that the server applied an edit. The actual Model hover is a separate measured request, not that edit-application guard.

The original `root-incomplete` mode requests members at an in-memory `ApplicationBlock.` expression and requires exactly the original 18 members. The new `root-hover` mode hovers the `Model` token in a valid `ApplicationBlock.Model` expression. Its guard requires the Application owner, `.Model: Struct<`, route and search signatures, and Model documentation, then requires unchanged hover contents after warming and editing. [root-hover.patch](./root-hover.patch) records the extension against the immutable original probe; both exact executed sources are archived.

Diagnostics use the original `root-diagnostics` mode: request clean diagnostics, change `CodexDiagnosticGuard: number = 1` to a string assignment, require error 2322 mentioning `string` and `number`, restore `1`, and require clean diagnostics. This measures diagnostic feedback in the real root file. It is not itself a negative test of all Block wiring contracts.

The unchanged native guards are **18 seconds per request, 22 seconds per process lifetime, 3 GiB RSS, and 4 GiB physical footprint**, with macOS libproc sampling every 250 ms. `GOMEMLIMIT` and `GOGC` were unset; the probes did not change the inherited child environment. Brief memory peaks between samples can be missed.

Across all 18 matched reports, the covered before/after inventories and compiler/harness identity guards remained unchanged during each run. Comparing arms, the only covered file difference was `packages/website/src/composition/composition.ts`; built declarations were identical. Within each mode, opened text, document versions, changed text/ranges, query positions, and compiler/client identities matched across arms. Document event timestamps are measurements, not expected-equal inputs. The inventory excludes `node_modules` and `.git`; selected compiler/client files are hashed separately, not every dependency.

No concurrent builds, watchers, or editor servers for this checkout were started during the matched probes. Host-wide idleness and scheduling were not instrumented. These native protocol timings exclude editor-client scheduling and do not establish live-editor or long-session responsiveness.

## All matched samples

All values below are request latency in milliseconds, rounded to three decimals. Medians summarize the three observations only where all three requests resolved. They are descriptive, not evidence of statistical significance or a stable speedup.

### Completed-root completion

| Arm/sample |     Cold | Immediate warm | After newline edit |
| ---------- | -------: | -------------: | -----------------: |
| A1         | 7217.858 |          0.736 |           7053.328 |
| A2         | 7240.213 |          0.706 |           6896.155 |
| A3         | 7217.957 |          0.489 |           7114.255 |
| A median   | 7217.957 |          0.706 |           7053.328 |
| B1         | 7111.926 |          0.609 |           6773.148 |
| B2         | 7059.200 |          0.531 |           6679.626 |
| B3         | 7547.725 |          0.574 |           7460.517 |
| B median   | 7111.926 |          0.574 |           6773.148 |

### Actual `ApplicationBlock.Model` hover

| Arm/sample |     Cold | Immediate warm | After newline edit |
| ---------- | -------: | -------------: | -----------------: |
| A1         | 7008.273 |          0.519 |           6882.206 |
| A2         | 7173.316 |          0.665 |           6882.781 |
| A3         | 7053.666 |          0.561 |           6834.791 |
| A median   | 7053.666 |          0.561 |           6882.206 |
| B1         | 6896.990 |          0.726 |           7128.623 |
| B2         | 6878.689 |          0.576 |           6408.117 |
| B3         | 8104.026 |          0.743 |           7322.822 |
| B median   | 6896.990 |          0.726 |           7128.623 |

All 18 cold/warm/post-edit hover markdown payloads across both arms were byte-identical: 1487 UTF-8 bytes, SHA-256 `1054428b2668176afdb09403c704fafa3be8f93add2fe8730071b36bdd61b633`. Native hover abbreviates the schema with `... 24 more ...`; equality of this displayed payload is not equality proof for every inferred field or requirement.

A deliberate external mutation changed the hover target from `Model` to `Message`. The request returned, but the Model-signature guard rejected it and the Node execution exited 1. Its raw report and `.node-execution.json` record are archived separately from the matched timings.

### Error appearance and clearing

| Arm/sample | Cold clean diagnostics | Error appearance |              Error clear |
| ---------- | ---------------------: | ---------------: | -----------------------: |
| A1         |               7335.639 |         6785.705 |                 6722.247 |
| A2         |               7155.258 |         6846.202 |                 6937.954 |
| A3         |               7425.417 |         7148.070 |                 6918.325 |
| A median   |               7335.639 |         6846.202 |                 6918.325 |
| B1         |               7221.709 |         6607.818 |                 7382.611 |
| B2         |               6850.925 |         6900.622 |                 6762.886 |
| B3         |               7364.480 |         7673.513 | Censored: lifetime guard |
| B median   |               7221.709 |         6900.622 |             Not reported |

**B3 is a failed diagnostics run, not a successful clear.** Error appearance returned after 7673.513 ms. The final clear request was still pending when the 22-second process lifetime expired, 6993.157 ms into that request. That number is time until rejection by the process guard, not error-clear latency and not an 18-second request timeout. The report records `Failed` and `Error: 22-second process wall limit`. It was not retried, omitted, or replaced with a timeout-valued sample. No candidate clear median is reported from the two successful clears.

All nine baseline reports passed. Eight candidate reports passed; candidate diagnostics sample 3 failed as above. Sub-millisecond warm replies do not offset multi-second post-edit completion, Model hover, and diagnostic feedback. The small completion-median difference does not justify adopting the import change, and these samples do not support a responsive-editor claim.

### Excluded exploratory runs

The archive also preserves the initial `baseline-completion-{1,2}.json` and `baseline-diagnostics-{1,2}.json`. They preceded Website `pretypecheck` generation of `src/generated/api.json` and `api-ui.json`, so they are not mixed into the matched sample set.

The initial `baseline-hover-1.json` failed during harness development: it expected fields that native hover abbreviates. It is not a candidate regression or a passing Model-hover sample. The corrected signature guard described above was fixed before the six matched hover invocations; it checks the actual Model target without claiming an unabridged type display.

## Source and emitted-declaration checks

The archived contract runner completed after the latency runs, separately and serially. Its manifest pins the same base, pnpm 11.8.0, native TypeScript 7.0.2, and unchanged compiler-budget configuration hashes.

| Existing gate                                                            | Baseline | Direct-import candidate |
| ------------------------------------------------------------------------ | -------- | ----------------------- |
| `pnpm --filter foldkit typecheck`                                        | Passed   | Not rerun               |
| `pnpm --filter @foldkit/ui typecheck`                                    | Passed   | Not rerun               |
| Complete Website source project through the transparent config extension | Passed   | Passed                  |
| `pnpm --filter foldkit check:emitted-declarations`                       | Passed   | Not rerun               |
| `pnpm --filter @foldkit/ui check:emitted-declarations`                   | Passed   | Not rerun               |
| `pnpm check:block-type-performance`                                      | Passed   | Not rerun               |

The baseline report has all six commands passed with exit 0 and `changedPaths: []`. The candidate report is explicitly `website-source-only; not full source/emitted/budget proof`: its Website command passed with exit 0 and `changedPaths: []`; the other five commands are `not-selected`. Unchanged framework source/declaration bytes explain that narrower candidate rerun, but do not turn it into a second full-suite execution.

Core source compilation includes existing accepted assertions and `@ts-expect-error` rejection checks. The core emitted gate passed its external emission, rejected wiring, relocation, native completion, and inferred configuration documentation checks. The UI emitted gate passed its isolated package builds, external emission, rejected source wiring, public generic Completed-shape checks, and relocated accepted consumers. **The UI gate does not rerun its rejected fixtures in the relocated consumer.** The emitted gates use strict external consumers with `skipLibCheck: false`.

The unchanged compiler budgets reported:

| Fixture                    | Instantiations delta / maximum | Types delta / maximum |
| -------------------------- | -----------------------------: | --------------------: |
| `deep-composition-8`       |               882807 / 1152618 |         45901 / 55843 |
| `wide-composition-100`     |              1975974 / 3132298 |        74682 / 216662 |
| `command-requirements-200` |               911507 / 2659415 |        67274 / 389460 |

All three rows were `ok`; budget/configuration hashes were unchanged. These are existing gate results, not exhaustive proof of every inference, registration, requirement, or lifecycle contract. Website typechecking is real source acceptance evidence, not an independent emitted-declaration portability proof for the complete Website. No candidate browser/runtime smoke test or runtime test suite was run. No runtime behavior change is shipped.

The contract runner uses a separate 600000 ms timeout per gate and owned process-group cleanup. Existing source/emitted scripts have no RSS/footprint cap. The editor probe's 18/22-second and 3/4-GiB limits do **not** supervise this multi-process contract suite. Setup and isolated builds are not editor latency measurements.

## Evidence archive

[evidence.tar.xz](./evidence.tar.xz) preserves the exact executed scripts and reports. Its SHA-256 is `429473812dfcf5bd05f3f6056f456729105f4629ff1ea1f73f795d2b28013527`. The archive contains 108 logical files; `archive-manifest.json` records hashes for the other 107 members. It expands to approximately 56 MB.

```text
tools/scope-root-editor-probe.mjs          original pinned modes
tools/memory-guard.py                     original pinned guard
tools/hover/scope-root-editor-probe.mjs    actual Model-hover extension
tools/hover/memory-guard.py               unchanged guard
tools/mutation/                           deliberate wrong-target probe
tools/run-editor-series.mjs               historical series launcher
tools/run-hover-mutation.mjs              historical mutation launcher
reports/editor/                          18 matched JSON reports and logs/exits
reports/exploratory/                      four early reports and failed hover development
reports/mutation/                        wrong-target report and Node execution record
contracts/                               executed runner, manifest, Website config
reports/contracts/baseline/               full runner report and command logs
reports/contracts/direct-import/          Website-only runner report and command logs
setup-observations.json                   observed setup commands, not raw setup logs
archive-manifest.json                     member hashes
```

The historical launchers retain their original absolute workspace/tool paths and are not directly portable. The commands below invoke the archived probes with explicit replay paths instead. The final loose artifacts are this README, [summary.json](./summary.json), the candidate patch, the hover-extension patch, and the archive. Executed harness and contract-runner sources live inside the archive, not as new permanent repository verification assets.

## Replay

Use macOS with Python 3, Node 22.23.3, Corepack, and jj available. Start from this draft's repository root in a jj repository. Use a new disposable workspace and new external output directories. Keep measurement serial; do not start this checkout's editor servers, builds, or watchers while probing. Use the same shell for the following sections.

### Prepare the pinned workspace

```sh
ARTIFACTS="$(pwd -P)/experiments/issue-1737-demand-boundary"
TOOLS="$(mktemp -d /private/tmp/foldkit-1737-tools-replay.XXXXXX)"
RESULTS="$(mktemp -d /private/tmp/foldkit-1737-results-replay.XXXXXX)"
WORKSPACE=/private/tmp/foldkit-1737-replay

printf '%s  %s\n' \
  429473812dfcf5bd05f3f6056f456729105f4629ff1ea1f73f795d2b28013527 \
  "$ARTIFACTS/evidence.tar.xz" | shasum -a 256 -c
tar -xJf "$ARTIFACTS/evidence.tar.xz" -C "$TOOLS"

jj workspace add --name issue-1737-replay \
  -r 9a5f9307cb4af2aca8a1e28bbf7b21cf64e5f87c "$WORKSPACE"
cd "$WORKSPACE"
corepack pnpm@11.8.0 install --frozen-lockfile
corepack enable --install-directory "$TOOLS"
export PATH="$TOOLS:$PATH"
pnpm --version
pnpm build:packages
pnpm --filter website typecheck
```

`pnpm --version` must print `11.8.0`. The external Corepack shim matters: the observed first `corepack pnpm@11.8.0 build:packages` attempt failed because an internal script invokes literal `pnpm`. Enabling the external shim fixed that environment problem; no source workaround was made. The full `pnpm build:packages` then succeeded. Setup stdout/stderr was not saved as raw log files; `setup-observations.json` identifies this provenance explicitly.

Website typechecking runs its existing `pretypecheck` generator. In the observed setup it produced the two API JSON inputs, reported zero documentation errors with existing documentation warnings, and passed typechecking. Complete this generation before either measured arm. Do not install, rebuild, regenerate inputs, change compiler versions, or update budgets between arms.

Verify the extracted probe identities before replay:

```sh
printf '%s  %s\n' \
  1491ea5fe44f546a4adfb74126a42ec866e7235a3c62f25dead66a6b75cc1751 \
  "$TOOLS/tools/scope-root-editor-probe.mjs" \
  3ccab68a8d5cac56adf8c01adcea22764a7b3de57d4a58889bcb52594cf4f5ad \
  "$TOOLS/tools/hover/scope-root-editor-probe.mjs" \
  f82396c66ef418574707f23e1056609be22b492308436d817d0102daefaa9eaf \
  "$TOOLS/tools/memory-guard.py" \
  f82396c66ef418574707f23e1056609be22b492308436d817d0102daefaa9eaf \
  "$TOOLS/tools/hover/memory-guard.py" | shasum -a 256 -c
```

### Repeat A, A, B, B, A, B

The following invokes the original completion/diagnostics modes and the separate hover extension. Every invocation has a new report path, retains stdout/stderr and exit status, and runs once. A failed request remains evidence; the loop does not retry it or change any guard.

```sh
(
set -eu
any_failure=0
run_sample() {
  label=$1
  repetition=$2
  for mode in root-incomplete root-hover root-diagnostics; do
    probe="$TOOLS/tools/scope-root-editor-probe.mjs"
    if [ "$mode" = root-hover ]; then
      probe="$TOOLS/tools/hover/scope-root-editor-probe.mjs"
    fi
    prefix="$RESULTS/$label-$mode-$repetition"
    status=0
    env -u GOMEMLIMIT -u GOGC node "$probe" \
      --workspace "$WORKSPACE" --disposable-workspace \
      --output "$prefix.json" --mode "$mode" \
      >"$prefix.stdout.log" 2>"$prefix.stderr.log" || status=$?
    printf '{"status":%s}\n' "$status" >"$prefix.exit.json"
    printf '%s: exit %s\n' "$prefix" "$status"
    if [ "$status" -ne 0 ]; then any_failure=1; fi
  done
}

run_sample matched-baseline 1
run_sample matched-baseline 2
git apply "$ARTIFACTS/direct-theme-menu.patch"
run_sample direct-import 1
run_sample direct-import 2
git apply -R "$ARTIFACTS/direct-theme-menu.patch"
run_sample matched-baseline 3
git apply "$ARTIFACTS/direct-theme-menu.patch"
run_sample direct-import 3
git apply -R "$ARTIFACTS/direct-theme-menu.patch"
exit "$any_failure"
)
```

The recorded run ended with exit 1 for B3 diagnostics and a censored clear, not 18 successful reports. A replay need not fail at precisely the same point; retain its actual outcomes. Compare the recorded identities, source/dist inventories, opened/changed documents, requests, returned members/hover, diagnostic codes, and guard outcomes before comparing timings. Do not modify tests, expected-member fixtures, signature checks, or budgets to obtain a passing result.

### Replay the contract runner

Extracting benchmark tools outside the checkout is intentional. The archived contract runner is different: it computes its repository root from its original relative location. Copy its exact archived directory into the disposable checkout before invoking it:

```sh
mkdir -p "$WORKSPACE/experiments/issue-1737-demand-boundary"
test ! -e "$WORKSPACE/experiments/issue-1737-demand-boundary/contracts"
cp -R "$TOOLS/contracts" \
  "$WORKSPACE/experiments/issue-1737-demand-boundary/contracts"

cd "$WORKSPACE"
env -u GOMEMLIMIT -u GOGC node \
  experiments/issue-1737-demand-boundary/contracts/run.mjs \
  --execute --label baseline --output "$RESULTS/contracts-baseline"

git apply "$ARTIFACTS/direct-theme-menu.patch"
candidate_status=0
env -u GOMEMLIMIT -u GOGC node \
  experiments/issue-1737-demand-boundary/contracts/run.mjs \
  --execute --label direct-import --only website-source \
  --output "$RESULTS/contracts-direct-import" || candidate_status=$?
git apply -R "$ARTIFACTS/direct-theme-menu.patch"
test "$candidate_status" -eq 0
```

Run these only after latency measurement has finished. Output directories must not already exist. The runner requires `jj log -r @- --no-graph -T commit_id` to equal **exactly** `9a5f9307cb4af2aca8a1e28bbf7b21cf64e5f87c`; an arbitrary artifact commit or a plain detached Git checkout does not satisfy that provenance check. Copying the runner to another relative depth also gives it the wrong root.

For both selected runs, expect runner status `passed`, selected commands with exit 0, and `changedPaths: []`. The full baseline logs must contain the core/UI emitted success summaries and three `ok` budget rows listed above. `--only website-source` deliberately does not run the other five gates. Its direct Website command is `pnpm exec tsc -p ../../experiments/issue-1737-demand-boundary/contracts/tsconfig.website.json --noEmit`, executed from `packages/website`; it skips the generation hook because setup has already generated those inputs. The runner does not install or rebuild missing prerequisites. Its reports and logs, rather than a command's presence in this README, establish what actually passed.
