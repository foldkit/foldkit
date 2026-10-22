# Terminal-root editor evidence for issue 1737

This experiment compares native TypeScript editor requests for the website's completed application root before and after the terminal-root change in [issue 1737](https://github.com/foldkit/foldkit/issues/1737). It measures completion, Model hover, and diagnostic appearance and clearing in fresh native LSP processes. It does not measure a running editor session.

## Files

This directory contains the reproducible evidence package:

- `probe-tools.tar.gz` contains the exact probe, summarizer, manifest helper, and runtime smoke/control scripts. Keep the scripts inside the archive until reproducing the experiment so repository formatters and linters do not rewrite evidence bytes.
- `exploratory-reports.tar.gz` contains the earlier raw reports, failed guard screens, control workloads, and session metadata. These reports explain the investigation and failed attempts, but they do not feed the final before/after aggregate.
- `final-reports.tar.gz` contains the 24 final native reports after the complete root-surface and union-provisioning repairs and website cycle-import cut, their stdout/stderr, the byte-preserved generated summary, fresh runtime proof, separately labeled historical controls, and before/after package source snapshots.
- `prior-format-reports.tar.gz` preserves the earlier 24-pass recording from the prior format iteration. It is excluded from the final aggregate.
- `prior-surface-proof-reports.tar.gz` preserves the subsequent 24-pass recording from before the complete root-surface exactness repair. It is an earlier `final-reports.tar.gz`, unchanged byte-for-byte, and is excluded from the final aggregate.
- `prior-union-proof-reports.tar.gz` preserves the 24-pass recording after the surface repair but before the union-provisioning repair, unchanged byte-for-byte and excluded from the final aggregate.
- `prior-cycle-proof-reports.tar.gz` preserves the immediately preceding 24-pass union-repaired recording before the website cycle-import cut and benchmark ambient-type correction. It is the preceding `final-reports.tar.gz`, unchanged byte-for-byte and excluded from the final aggregate. Together with the current final, exploratory, tools, and other three prior archives, this makes seven archives.
- `evidence-manifest.json` records archive hashes, member hashes, report coverage, and the final report naming contract.
- `final-summary.json` retains all request timings and aggregates the three fresh-process runs per arm and mode.

## Revisions and environment

The baseline is commit `9a5f9307cb4af2aca8a1e28bbf7b21cf64e5f87c`. The candidate is the draft PR head containing this experiment. Check out the PR revision being evaluated and record its exact commit with `git rev-parse HEAD`; a moving branch name alone does not identify a measured revision.

Both measured worktrees require Node `22.23.3`, pnpm `11.8.0`, a frozen lockfile installation, and `pnpm build:packages`. The comparison uses the installed native TypeScript wrapper and darwin-arm64 compiler package at `7.0.2`, with matching compiler, launcher, resolver, and JSON-RPC client byte identities. The probes record those identities rather than assuming that matching version strings imply matching binaries.

The Go runtime variables `GOMEMLIMIT`, `GOGC`, `GOMAXPROCS`, `GODEBUG`, `GOEXPERIMENT`, and `GOENV` are unset. The harness does not tune or replace the child's environment.

### Relation to the issue's latest local candidate

The [issue's latest local candidate](https://github.com/foldkit/foldkit/issues/1737#latest-local-candidate-and-experiment-ledger), updated on 2026-10-21, is unpublished commit `ad59afc770deb8d497498806864016c3e5940d06`. The issue reports an API-preserving combined change measured on native TypeScript `7.1.0-beta`, including 2649 ms median post-edit root completion. That is not an arm of this experiment. Our paired comparison is **only** public `9a5f9307` versus this terminal-root boundary on native TypeScript `7.0.2`; it does not establish a speedup over, or a ranking against, the unpublished candidate or beta compiler.

This proposal is a boundary alternative with an explicit API tradeoff, not a drop-in API-preserving replacement for that latest candidate. It changes the terminal application surface and splits the facade from its implementation; ordinary composition remains on the existing Block API.

## Final measurements

All 24 native reports passed their request, identity, unchanged-file, and semantic guards. Each cell below is **median [min, max] in milliseconds**, rounded to one decimal place, across three fresh native processes. The rows are distinct request workloads, not a single continuous editor session.

| Workload                                |                Baseline |            Candidate |
| --------------------------------------- | ----------------------: | -------------------: |
| Incomplete access: cold completion      | 6753.6 [6610.8, 6920.1] | 613.5 [564.0, 665.4] |
| Incomplete access: post-edit completion | 6516.8 [6450.9, 6849.2] | 404.3 [388.1, 417.1] |
| Valid access: cold completion           | 6636.3 [6577.9, 7110.8] | 625.6 [564.1, 636.2] |
| Valid access: post-edit completion      | 6420.2 [6403.1, 6772.5] | 404.4 [388.6, 410.6] |
| Model: cold hover                       | 6769.5 [6641.7, 6996.7] | 644.8 [607.4, 677.6] |
| Model: post-edit hover                  | 6466.2 [6449.3, 6746.6] | 424.7 [411.4, 438.0] |
| Diagnostics: cold clean document        | 6684.6 [6665.4, 6935.8] | 224.7 [215.5, 297.1] |
| Diagnostics: error appearance           | 6440.1 [6402.2, 6672.4] |       3.5 [3.3, 3.5] |
| Diagnostics: error clearing             | 6399.4 [6317.9, 6417.9] |       3.9 [3.2, 4.0] |

Warm completion and hover requests are retained separately in `final-summary.json`; they are not the post-edit measurements above. The diagnostic edit changes an isolated typed value and restores it, so its fast appearance/clearing rows do not imply that every implementation edit is equally inexpensive.

The final reports were rerun after the complete root-surface, declaration-portability, and union-provisioning repairs, website cycle-import cut, and benchmark ambient-type correction. Each native invocation hashes the complete covered workspace, including retained earlier evidence files. A separate `final-source-identity-after-format.json` records **2824 checked package files with no changed files** across the measurement. Its byte-identical before/after maps are archived under `source-snapshots/`; this package guard covers the listed source, configuration, and documentation extensions, includes test-result artifacts, and excludes `node_modules`, `dist`, `.git`, `.vite`, and `generated` directories. It is distinct from the broader per-invocation probe hashes. The final PR commit identifies the delivered patch; subsequent updates to report archives, the summary, manifest, and this documentation are evidence-only, not runtime-code changes.

### Verification prerequisites and observed results

The Website cycle-import cut imports the ThemeMenu Block directly and changes `tableOfContentsFor` to accept `apiData` instead of the surrounding Model, removing its dependency on that Model module. The benchmark configuration explicitly includes `vite/client` ambient types needed by transitively imported Foldkit source. These changes unblock circular-dependency and typecheck verification; this paired experiment does not isolate their performance effects or attribute the measured latency improvement to them.

Before the final 24-report run, all 52 workspace projects passed `pnpm -r typecheck`, and `pnpm test` passed all workspace modules, including the website's 38 files and 1449 tests. The initial browser wrapper skipped because browser binaries were missing. After installing Chromium 1243 and its headless shell, actual browser E2E exited 0 in 3.3 minutes: **17 passed and 1 flaky combobox test passed on retry**. Its first attempt observed `data-foldkit-build` count 1 instead of 0; this is not 18 clean first-attempt passes. The fresh native measurement began only after browser E2E completed.

The earlier full pre-push invocation passed through 226 script tests, circular checks, builds, core/UI emitted declarations, and compiler budgets before missing benchmark ambient types blocked typecheck. The correction subsequently passed all workspace typechecks. The full actual push hook for the final commit is still pending; no final-hook pass is claimed here. The manifest retains these verification observations separately from latency results.

## What changes at the application boundary

The website exports a terminal application root with six public fields: `owner`, `Model`, `Message`, `init`, `update`, and `operations`. The ordinary Block surface remains available for composition. The terminal root is not another composition input.

The website's `block.ts` exports the `ApplicationBlock` value annotated with `ApplicationRoot`, imported from `blockImplementation.ts`. The facade does not export the root type. The implementation file retains the full implementation check. Three named interfaces give the compiler reusable names for exact derived contracts:

- `ApplicationRootChannels` extends `Block.RootChannelsFor<typeof ApplicationComposition, typeof implementation>`.
- `ApplicationMessage` extends the exact schema type derived from `ApplicationComposition.Message`.
- `ApplicationImplementation` extends the exact type of `implementation`.

The root uses the canonical `typeof Model`, not a Model type recovered through the expensive implementation argument. Private exact channels include `EffectsLayer`; the public root does **not** expose an `EffectsLayer` field. The boundary preserves the derived requirements and lifecycle contracts rather than widening them to shorten hover output.

Assembly evidence retains the canonical six-field public surface alongside derived requirements, registration evidence, and lifecycle contracts. Runtime-facing consumers only recover the service, registration, and view evidence when the exposed `owner`, `Model`, `Message`, `init`, `update`, and `operations` contracts match that canonical surface. Rejection fixtures cover direct generic annotations and named projected root interfaces, including widened schema channels, mismatched owners, callable/operation drift, and nested `any` erasure. The named exact interfaces remain usable without consumer casts or widened contracts. Source and external emitted-declaration proofs also cover portable naming and relocation; preserving a fast hover is not a substitute for those acceptance/rejection checks.

Program provisioning must distinguish a service installed by one possible Block from a service guaranteed for every selected alternative. The union repair filters each possible complete service capability against every ordinary Block, terminal-root, or mixed alternative, without changing per-branch requirements. It retains pending requirements unless that capability is guaranteed regardless of the selected branch, or is actually supplied by a provider. Singleton Blocks and roots can use their installed resources, as can unions whose alternatives all install the required service. Valid per-member assembly and explicit service provision retain their precise requirements. Source and emitted consumer controls exercise empty and unrelated providers as well as valid provider cases.

This is a deliberate API tradeoff: a smaller terminal surface, a separate implementation file, and three named exact interfaces in exchange for less repeated type expansion at the public application root. Assembly still uses the existing runtime block assembly function, without an additional runtime wrapper or object copy. The experiment does not claim that every composition path becomes inexpensive.

## Probe provenance and deliberate adaptations

| File                                      | SHA-256                                                            |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `scripts/scope-root-editor-probe.mjs`     | `1491ea5fe44f546a4adfb74126a42ec866e7235a3c62f25dead66a6b75cc1751` |
| `scripts/candidate-root-editor-probe.mjs` | `f7268c088ee254f69be0cefea43a647bcfd10796a673ae9c67d000e7a55cd139` |
| `scripts/lazy-hover-probe.mjs`            | `5c690ddfbb7c3eae0b824867a98a7aa69bb5285291567759308a876bb5e76bc8` |
| `scripts/memory-guard.py`                 | `f82396c66ef418574707f23e1056609be22b492308436d817d0102daefaa9eaf` |

The original completion probe is unchanged. The candidate completion probe changes only the expected root member list from the original 18 members to the six public terminal fields, plus the corresponding failure message. Requiring the old 18-member surface on the candidate would test the removed API, not preservation of the terminal contract.

The shared hover probe adds `root-hover` and targets `ApplicationBlock.Model` in both arms. It rejects Message hover and requires all six canonical Model signature tokens:

```text
.Model: Struct<
readonly route: RouteUnion<
readonly Home: {};
readonly ExampleDetail: {
exampleSlug: String;
readonly search: Struct<
```

The hover guard does not require the earlier `BlockContractFields` spelling or TSDoc text. Native hover abbreviates the search internals as `Struct<...>`; the omitted fields are not proved by matching hover text. Their exactness is covered by the source and emitted-declaration checks, not by this timing experiment.

Both adaptations retain the document edit flow, source/disk identity guards, compiler identity guards, owned-process memory monitor, and time limits. The same hover script is used on both revisions.

## Reproduce the final measurement

Run these commands from the repository after checking out the candidate PR head. Use macOS arm64 with Node `22.23.3` and pnpm `11.8.0` available. The generated directories are disposable, and both measured worktrees must remain unchanged while probes run. Do not build, format, generate files, or edit either worktree during measurement.

The tools and outputs must be outside **both** measured worktrees. The probes reject noncanonical paths and refuse to overwrite existing report files.

```sh
set -eu

CHECKOUT=$(pwd -P)
CANDIDATE_COMMIT=$(git rev-parse HEAD)
BASELINE_COMMIT=9a5f9307cb4af2aca8a1e28bbf7b21cf64e5f87c
ARTIFACT="$CHECKOUT/experiments/issue-1737-terminal-root"
RUNROOT=$(mktemp -d)
RUNROOT=$(cd "$RUNROOT" && pwd -P)
BASELINE="$RUNROOT/baseline"
CANDIDATE="$RUNROOT/candidate"
OUTTOOLS="$RUNROOT/tools"
RESULTS="$RUNROOT/results"
mkdir -p "$OUTTOOLS" "$RESULTS"
tar -xzf "$ARTIFACT/probe-tools.tar.gz" -C "$OUTTOOLS"

git worktree add --detach "$BASELINE" "$BASELINE_COMMIT"
git worktree add --detach "$CANDIDATE" "$CANDIDATE_COMMIT"
for workspace in "$BASELINE" "$CANDIDATE"; do
  (
    cd "$workspace"
    corepack pnpm install --frozen-lockfile
    corepack pnpm build:packages
  )
done

unset GOMEMLIMIT GOGC GOMAXPROCS GODEBUG GOEXPERIMENT GOENV
printf 'baseline %s\ncandidate %s\n' "$BASELINE_COMMIT" "$CANDIDATE_COMMIT" > "$RESULTS/revisions.txt"
shasum -a 256 "$OUTTOOLS"/scripts/* > "$RESULTS/probe-sha256.txt"
```

Each command below starts a new native server. Within each request flow, cold, warm, and post-edit responses are measured separately. A newline `didChange` precedes the post-edit completion or hover. A subsequent hover of `CodexAppliedEditGuard = 1737` confirms that the server applied an actual semantic edit. Diagnostic requests instead check a clean document, the appearance of string-to-number error `2322`, and its clearing after the value is restored.

```sh
for round in 1 2 3; do
  for mode in root-incomplete root-valid root-hover root-diagnostics; do
    probe="$OUTTOOLS/scripts/scope-root-editor-probe.mjs"
    if [ "$mode" = root-hover ]; then
      probe="$OUTTOOLS/scripts/lazy-hover-probe.mjs"
    fi
    node "$probe" --workspace "$BASELINE" --disposable-workspace \
      --mode "$mode" --output "$RESULTS/final-baseline-$mode-$round.json"

    probe="$OUTTOOLS/scripts/candidate-root-editor-probe.mjs"
    if [ "$mode" = root-hover ]; then
      probe="$OUTTOOLS/scripts/lazy-hover-probe.mjs"
    fi
    node "$probe" --workspace "$CANDIDATE" --disposable-workspace \
      --mode "$mode" --output "$RESULTS/final-candidate-$mode-$round.json"
  done
done

node "$OUTTOOLS/scripts/summarize-final.mjs" \
  "$RESULTS" "$RESULTS/final-summary.json"
```

The run order alternates baseline and candidate for each mode, repeated across three rounds. Baseline completion and diagnostics use the untouched original probe; candidate completion and diagnostics use the six-member adaptation. Hover uses the shared hover probe in both arms.

The summarizer reads the 24 exact `final-baseline-<mode>-<round>.json` and `final-candidate-<mode>-<round>.json` inputs for these four modes and rounds 1, 2, and 3. It rejects failed statuses, mismatched compiler/runtime identities, changed source or disk contents, wrong workload variants, missing measurements, and failed semantic guards. It writes a new summary without changing the raw reports. A failed run must remain failed evidence; do not rename an exploratory success over a failed final input or weaken a guard to produce a table.

The published `final-summary.json` is the unchanged output of the preserved summarizer validated against all 24 new final reports in `cycle-proof-final`. `final-reports.tar.gz` retains the raw JSON, stdout, and stderr for every run, including empty stderr files. The archived summary and the separate summary file retain those exact generated bytes and must not be reformatted. `prior-format-reports.tar.gz`, `prior-surface-proof-reports.tar.gz`, `prior-union-proof-reports.tar.gz`, and `prior-cycle-proof-reports.tar.gz` retain their earlier recordings unchanged and are not part of the final aggregate. The original exploratory and tools archives are preserved byte-for-byte.

## Exploratory report archive

`exploratory-reports.tar.gz` keeps the investigation history. It includes raw JSON reports, session metadata, and fail-before text files that predate the final 24-report measurement. It excludes package-manager shims, worktree caches, `node_modules`, and the final results. `evidence-manifest.json` lists the archived files and marks their roles.

The archived failed reports are useful evidence. They show which guard failed, which mutation was rejected, or which exploratory surface was measured. They must not be edited, deleted, or counted as successful final measurements.

## Runtime and negative-control proof

The recorded runtime smoke exits with code 0 and `ROOT_RUNTIME_SMOKE_OK 10 assertions groups`. It exercises passive assembly/configuration, actual server rendering of a registered child without Command/Mount execution, and Element/Document behavior covering provided service identity, init/update Commands, retained children and Mounts, selective child disposal, and exactly-once resource release. The full output is `runtime/final-runtime-smoke.txt` in `final-reports.tar.gz`.

Two separate controls fail as intended. `controls/final-hover-wrong-target-control.json` records the Model-hover guard rejecting a hover of Message; its process output is preserved in `controls/final-hover-wrong-target-control-output.txt`. `controls/final-runtime-registration-control.txt` records exit code 1 when a mutated root lacks a default view. Neither failed control enters the latency table.

`controls/explicit-channel-before-build.txt` records six TS2578 failures when the prior optional-only implementation-channel guard is restored, followed by a clean declaration-proof run after restoring the exact-value guard. The earlier covariance and optional-channel fail-before screens remain in `exploratory-reports.tar.gz`. These mutation screens demonstrate that the rejected cases depend on the corresponding guards; they are not passing candidate diagnostics.

`controls/surface-erasure-before-build.txt` records **23 TS2578 errors** before the complete surface repair: the rejection fixtures' `@ts-expect-error` directives were unused because those unsafe annotations were accepted. `controls/surface-erasure-restored-source-pass.txt` records exit code 0 for the restored core build, full root-boundary source module, and complete external emitted-declaration proof, including rejection wiring and relocation. These are static acceptance/rejection controls, not native latency trials.

A separate built-package, happy-dom control dispatches an actual `popstate` event. Deliberately unchecked JavaScript supplies a `ChangedLocation` message without `query` to an update expecting `query.length`; the recorded outcome is the original `TypeError`, not a prevented crash. `controls/surface-routing-reproduction.txt` records that result, and `controls/root-surface-routing-reproducer.mjs` preserves the exact reproducer. Its exit code 0 confirms that the expected unsafe behavior was reproduced. The `.mjs` script intentionally bypasses static checking: the repair rejects the corresponding invalid TypeScript contracts, not arbitrary unchecked JavaScript at runtime. No runtime crash-prevention or runtime-validation change is claimed.

The union-provisioning controls establish a branch-introduced regression and its removal, not a defect in the published baseline. The exact strict, cast-free source `controls/ordinary-union-check.mts` is shared by three observed controls: public `9a5f9307` exits 0 and consumes the expected invalid-`start` rejection; the pre-repair candidate exits 1 with one TS2578 because unsafe `start` was admitted; the repaired candidate exits 0 and consumes that rejection again. Their outputs are `controls/ordinary-union-baseline-control.txt`, `controls/ordinary-union-candidate-before-control.txt`, and `controls/ordinary-union-candidate-after-control.txt`.

`controls/union-provision-fail-before.txt` separately records the initial **10 TS2578 errors** across five unsafe ordinary/root/mixed/provider cases in source and consumer fixtures. `controls/union-provision-final-fixture-mutation.txt` records a clean **12 TS2578 errors, with no other diagnostics**, after mutating the final service filter to treat a service missing from one branch as available. Restoring the helper passes the full root-boundary source module, complete external emitted-declaration proof, core build, and unchanged numerical compiler budgets; `controls/union-provision-restored-source-pass.txt` records the commands, output, and exit code 0. Neither fail-before screen contributes a successful latency trial.

The actual built-package union runtime control selects B, which does not register `Session`, supplies `Layer.empty`, and reaches the init `Read` command. `controls/union-runtime-reproduction.txt` records the missing `@foldkit/ManagedResource/UnionProvision/Session` service and zero successful resource reads. Its exact script is `controls/union-provision-runtime-reproducer.mjs`. As with the routing control, exit code 0 means the unsafe behavior was reproduced; unchecked JavaScript bypasses the repaired TypeScript contract, so no runtime fix or automatic service installation is claimed.

The original runtime and mutation scripts remain unchanged in `probe-tools.tar.gz`. Both added runtime reproducers and the strict union-control source are kept separately in `final-reports.tar.gz`, not added to that immutable tools archive. The runtime smoke was freshly rerun against the cycle-proof candidate build, exiting 0 with 10 assertion groups. All controls retain historical provenance: registration and hover negative controls, routing reproduction, and union runtime reproduction come from `union-proof-final`; earlier surface-erasure and explicit-channel static controls retain their original recordings. None is presented as a fresh cycle-proof control or included in the latency aggregate. Runtime checks use the built candidate package, not source imports or a mocked implementation.

## Guard coverage and limits

The harness hashes readable regular files and symlink targets throughout each worktree before and after each run, excluding `.git` and `node_modules`. Symlinks are recorded without following them. Compiler, native executable, launcher, resolver, protocol client, probe, and monitor are hashed separately. This is not a complete dependency inventory. Hashes detect covered changes; they do not prevent another process from writing files.

The macOS libproc monitor samples the owned native process every 250 ms. It verifies the owning probe PID and process birth identity and refuses to signal a replacement process. The run fails above 3 GiB RSS, above 4 GiB physical footprint, after a 22-second native-process wall limit, or after an 18-second request timeout. Brief memory peaks between samples may be missed. The monitor has its own bounded 27-second lifetime.

The native server is deliberately terminated during owned cleanup. A nonzero native exit after completed requests is not by itself a failed workload; the report's status and cleanup guards distinguish completion from a premature exit, timeout, or memory kill.

Unrelated native/JavaScript TypeScript editor servers and a Vite dev server were present on the measurement host and were left running. This is not a fully idle-host latency estimate. Three fresh-process runs provide repeatability for the recorded workloads, not a claim of uncontended or cross-host performance.

This evidence does not establish Neovim behavior, all-day live editor responsiveness, arbitrary edit latency, or improvement to all composition costs. Warm responses are not post-edit responses. The newline post-edit workload and separate semantic edit guard should not be described as a complete interactive editing trace. Comparisons use the same host and installed TypeScript `7.0.2` identities, not a different host or a TypeScript beta compiler.

The surface proof checks canonical schema channels, schema constructor arguments/instances, and callable contracts. It does not establish equality of arbitrary added custom schema constructor-overload metadata beyond TypeScript's reflection capabilities, or runtime enforcement for JavaScript that bypasses the type checker. Nor does this paired measurement evaluate the issue's unpublished API-preserving candidate, its `7.1.0-beta` compiler, or its sustained overlapping-request protocols.

The union service projection includes existing descendant channels; keyed-child recursion retains full scoped placement identities. This is not a broader child-aggregation redesign or a new proof of preexisting unkeyed descendant aggregation, which remains unchanged.

## Changeset gate on divergent branches

The changeset prose gate compares committed changesets and working-tree visibility from the same merge base as Changesets CLI. A changeset consumed only on the base branch is not a missing branch changeset. Deleting a branch-added changeset locally is rejected, as is a wrapped branch summary. Isolated Git-repository controls cover all three cases; the direct-base comparison fails those controls.

This gate adjustment does not change the package sources or measured workloads.

## Static archive checks

These commands inspect the artifact without running probes:

```sh
shasum -a 256 experiments/issue-1737-terminal-root/*.tar.gz
tar -tzf experiments/issue-1737-terminal-root/probe-tools.tar.gz
tar -tzf experiments/issue-1737-terminal-root/exploratory-reports.tar.gz
tar -tzf experiments/issue-1737-terminal-root/final-reports.tar.gz
tar -tzf experiments/issue-1737-terminal-root/prior-format-reports.tar.gz
tar -tzf experiments/issue-1737-terminal-root/prior-surface-proof-reports.tar.gz
tar -tzf experiments/issue-1737-terminal-root/prior-union-proof-reports.tar.gz
tar -tzf experiments/issue-1737-terminal-root/prior-cycle-proof-reports.tar.gz
```

To verify the preserved probe bytes, extract the tools archive into a temporary directory outside the measured worktrees and hash the scripts there:

```sh
VERIFY=$(mktemp -d)
tar -xzf experiments/issue-1737-terminal-root/probe-tools.tar.gz -C "$VERIFY"
shasum -a 256 "$VERIFY"/scripts/scope-root-editor-probe.mjs \
  "$VERIFY"/scripts/candidate-root-editor-probe.mjs \
  "$VERIFY"/scripts/lazy-hover-probe.mjs \
  "$VERIFY"/scripts/memory-guard.py
```
