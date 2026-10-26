# Workspace compiler and editor measurements

## Integrated disposition

The approved record/context update API, canonical mixed-result guard, connected OutMessage protection, and named public UI headers are integrated. Source/emitted rejection, runtime tests and compiler budgets pass. The expanded Workspace root now emits and relocates after two internal callable interfaces preserve its existing update and Document-view contracts. Its four direct property controls remain unchanged. The separate 32-group synthetic root still reaches TS7056. See [the integrated report](preview-framework-performance.md) and [current task status](next-preview-tasks.md).

The first integrated benchmark preceded queued Workspace UI work and the internal repair. It recorded a repeatable Website cold-access/post-edit cost alongside similar Workspace and runtime results. The [final post-change comparison](preview-framework-performance.md#final-post-change-benchmark) is complete and retains the measured Website editor costs. The historical measurements and rejected controls below retain their original scope; they do not describe an open failure in the now-repaired real Workspace root.

## Current declaration serialization repair

The adopted `CompletedUpdate` and `OwnedDocumentView` interfaces retain the existing dual update signatures, exact context tuple, output channels, owner invariance, and graph/view evidence. No consumer API or storage change is required. The original encoding and either single-interface removal reproduce the expanded root's failure, so both names belong to the repair.

The full application now emits 80 declarations totaling 7,000,351 bytes and passes strict relocated accepted/rejected checks. Core/UI source, builds and complete external declaration harnesses pass, as do all five unchanged compiler ceilings. All 280 emitted core JavaScript files are byte-identical to the control. Independent review found no inference, variance, safety, or declaration-portability objection.

The 32-group aggregate-operation root still reaches TS7056. This is a specific remaining serialization limit, not a universal Block-count ceiling. Declaration emission and count budgets establish no editor speedup; the final editor measurements remain a separate result from declaration emission. [Repair evidence](preview-framework-performance.md#named-contract-serialization-repair).

## Candidate and workload

Measured on `codex/workspace-example`, based on `31d8aad9fe4555112b3cf8e2d948badeee9ced0d`, with the uncommitted workspace application and profiling changes. These are development measurements, not measurements of the published Ready preview.

- Official native TypeScript `7.1.0-beta`, `@typescript/typescript-darwin-arm64`; Node `24.22.1`, macOS arm64.
- Pre-migration application workload SHA-256: `8cb762888e252cc59674bcfcb9d2e4a86c7aa313b35336735574cc79dce68273`. The final confirmation below records the subsequent source freeze separately.
- Profiling script SHA-256: `bb1161e85e202b8582ce8c840ae8b55b575aadb52fca70f37fbac84e061245a6`.
- Lockfile SHA-256: `a9828cc4183827876b63141a823a7c833db9726fcb3642e7cd9b2e6fd135b099`.
- Eight application Blocks, six root Bindings, and nested Dialog, Animation, DragAndDrop, and Comment Composer relationships. Sixteen issue records are runtime data; they do not increase the static graph.
- Vite and build checks were stopped during the pre-migration editor run. The final confirmation below leaves the requested development server and existing user-owned watchers running, without scheduling build/test jobs concurrently.

## Editor requests

Run from the repository root:

```sh
node packages/foldkit/scripts/profile-block-language-service.ts --scenario workspace --runs 3
```

Each repetition uses fresh native language servers for Binding hover, Binding completion, completed Block completion, and diagnostics. A warmed request precedes an incremental whitespace edit. The diagnostic scenario changes an Issue Detail title writer from `value` to `value.length`, requires TS2322 at the title field, then restores the source and requires clean diagnostics. Changes exist only in the server document, not on disk.

| Request after edit                            |     Median | Range, three repetitions |
| --------------------------------------------- | ---------: | -----------------------: |
| Issue Detail Binding hover                    | 151.917 ms |       148.854–152.119 ms |
| Binding member completion                     | 134.930 ms |       123.522–138.231 ms |
| Completed Application Block member completion |  12.909 ms |         12.465–18.152 ms |
| Error appearance                              | 109.912 ms |        99.263–112.219 ms |
| Error clearing                                |  87.037 ms |         86.853–96.878 ms |

Maximum sampled server RSS was 400,272 KiB (390.89 MiB). Samples include startup, 250 ms intervals, and a final sample before shutdown. Sampling can miss short peaks and does not establish long-session memory stability. These measurements exclude editor UI rendering and unrelated editor plugins.

The earlier vertical slice had fewer Blocks and features. Its timings are retained as a workload-development baseline, not as an equivalent comparison or a speedup claim. These results also do not describe Website latency or tsrs performance.

## Compiler and declaration checks

The completed application source check recorded 5,238,189 instantiations, 383,075 Types, 447,680 KiB reported memory, and 1.422 seconds checking / 1.550 seconds total. Source checking passes.

In the original checkpoint, full application declaration emission fails with TS7056 at the private `prepare` producer: the inferred type exceeds TypeScript's serialization limit. A separate named EffectsLayer, a named implementation record, and an exact local implementation type did not fix that failure; none was retained as a workaround. The check recorded 5,267,336 instantiations, 498,549 KiB reported memory, and 0.970 seconds checking / 1.381 seconds total before failing. This was the original framework scale finding. The current two-interface repair above closes the real application failure without changing these historical counts.

## Larger distinct static graphs

The existing type-performance infrastructure now includes generated workspace workloads. Regenerate them with:

```sh
node packages/foldkit/type-performance/workspace-generate.ts
```

For N groups, each workload has N + 3 distinct completed Blocks, 4N Bindings, N Mounts, and 2N + 1 local handler recipes. Each group includes required, optional keyed, and wrapped-array child initialization, extracted views, Services, and operations. See the [fixture README](../packages/foldkit/type-performance/README.md) for source/emitted-declaration commands and type assertions.

| Groups | Instantiations above baseline |   Types | Symbols | Source check | Emitted external consumer |
| ------ | ----------------------------: | ------: | ------: | ------------ | ------------------------- |
| 4      |                     2,639,574 | 206,314 | 276,265 | Pass         | Pass                      |
| 8      |                     4,515,010 | 280,523 | 402,969 | Pass         | Pass                      |

Together, the retained fixtures emitted five declaration files totaling 2,997,831 bytes; the compiler reported 567,560 KiB memory and 1.338 seconds total. Their external declaration consumer passed in 0.768 seconds. Regeneration is deterministic. Exact Models, encoded contracts, requirements, errors, operations, and Mount channels are asserted.

In the original encoding, sixteen- and thirty-two-group probes pass source checking but fail declaration serialization with TS7056 at `prepare`. Moving an exact return annotation to that producer only moves the serialization failure to the Composition. The generator retains these larger probes; they are not included among passing emission fixtures. Existing three compiler budgets remain unchanged. Four/eight-group entries have their own measured budgets.

## Verification boundary

At this checkpoint, the application has 87 passing unit, Story, and Scene tests, plus focused browser regressions. Its behavior, source check, and editor baseline are verified. Declaration serialization was still open at that checkpoint. The current repair above establishes real full-root emission; the 32-group synthetic limit remains. The upcoming Model-aware `makeCommandsStep` migration requires its own checks; it is not included in this source hash.

## Command-step migration verification

After migrating Command-only Steps to `makeCommandsStep(model => commands)`, the workload hash is `8b3c4055965493263d001d5b7a754aaa40ff2d4d3d4b0074bcd64a3ba732d5c0`. Compiler/server/Node versions, script hash, and lockfile hash are unchanged. Three fresh runs of the same editor requests produced:

| Request after edit         |     Median | Range, three repetitions |
| -------------------------- | ---------: | -----------------------: |
| Binding hover              | 130.089 ms |       129.737–142.304 ms |
| Binding completion         | 124.885 ms |       124.181–125.377 ms |
| Completed Block completion |  14.885 ms |         12.640–29.778 ms |
| Error appearance           |  97.049 ms |        96.806–109.687 ms |
| Error clearing             |  97.591 ms |        88.037–107.966 ms |

Maximum sampled RSS was 406,624 KiB (397.09 MiB). This verifies responsive requests for the changed app; the two batches were not alternated pairs and do not establish a causal speedup. Post-migration source checking passes with 5,184,205 instantiations and 382,265 Types. All five compiler fixtures pass without changing existing budgets; the two workspace fixtures' counts are unchanged.

## Independent serialization controls

Astra at Max independently reproduced the full-app and sixteen-group emission failures in isolated copies. A named framework interface around unresolved preparation arguments still failed. Exported consumer type aliases also failed. Exported consumer interfaces extending the exact checked `FromAssembly*` contract emitted successfully: TypeScript retained the named interface instead of recursively expanding the child's private producer inside `SelectedChildBinding`.

For the eight-group root, that diagnostic control reduced the serialized producer from 1,175,283 bytes to 494,131 bytes. Interfaces on the app's eight completed Blocks allowed its 78 declarations to emit, totaling 4,400,138 bytes. Synthetic eight/sixteen-group output and full-app output passed relocated consumers with `skipLibCheck: false`; existing synthetic exact-channel assertions passed. Runtime expressions were unchanged.

This control proves an encoding issue rather than an inherent impossibility for the graph or `typeof prepare`. It is not adopted: the added interfaces repeat consumer declarations, alter the approved header shape, lack editor comparison and new interface-specific rejection proofs, and still produce substantial declarations. The internal wrapper alone did not justify a framework patch. The current SPA uses `noEmit`; publishing similarly composed libraries can encounter the demonstrated TS7056 boundary. There is no asserted universal Block-count limit. Preserve the established authoring surface while tracking this specific library-emission limitation for further work.

## Final integration checks

The post-migration application still passes 87 tests and its production build. All 15 browser regression cases pass, including both same-column and cross-column optimistic keyboard drops before save completion. The lint migration also fixes a reproduced child-owned callback false positive: makeCommandsStep is recognized as an owning context, while parent construction and unrelated-method cases retain their existing behavior. Twelve focused lint tests, real-fixture/plugin typechecks, and plugin build pass. These lint/test/documentation changes do not alter the measured application source hash.

## Final editor confirmation

At `2026-10-23T04:41:35.934Z`, the final workload hash is `ee7b2812d4da738a3d203724b0bc8f6883d2b98ecd1429fec82a55ab8fcfa430`. It includes the final Settings checkbox SVG/focus styling. The experimental Command-argument helper has been removed; it is not part of this measurement. Compiler/server/Node versions, lockfile hash, and benchmark-script hash remain as recorded above.

| Request after edit         |     Median | Range, three repetitions |
| -------------------------- | ---------: | -----------------------: |
| Binding hover              | 138.466 ms |       130.429–145.966 ms |
| Binding completion         | 141.590 ms |       125.793–141.723 ms |
| Completed Block completion |  18.836 ms |         13.311–22.219 ms |
| Error appearance           |  96.681 ms |         95.039–96.938 ms |
| Error clearing             |  89.843 ms |        89.508–106.434 ms |

All expected completion members, hover contract fragments, the deliberate TS2322 title error, and subsequent clean diagnostics were verified. Maximum sampled server RSS was 413,248 KiB (403.56 MiB), with the same sampling and fresh-session limitations. Raw report: `/private/tmp/foldkit-workspace-language-service-final.json`.

The development server and pre-existing user-owned build watchers remained available. No agent build/test or other benchmark was scheduled concurrently; this is not a fully isolated host or a long-session leak test. These repeated results establish the measured Workspace workflows, not a speedup claim, Website timing, or universal framework responsiveness.

Final source checking, Website source checking, and the production build pass. Vite 8.3.5 transforms 709 modules; output is 577.06 kB JavaScript (166.91 kB gzip) and 33.21 kB CSS (7.07 kB gzip). The existing extensionless-config-import and 500 kB chunk warnings remain visible. All five compiler fixtures pass again with unchanged ceilings and the original four/eight-group counts. The full-app TS7056 limitation was unchanged at this historical checkpoint; the current internal repair above supersedes that disposition.

The final browser additions bring coverage to 16 passing cases. The last case uses a real pointer drag with the save timer paused, verifies immediate cross-column placement and pending controls, then verifies persistence after saving. The E2E package typecheck passes. This test-only addition does not change the measured application source hash.

## Retained-draft verification

At `2026-10-23T21:09:19.978Z`, the expanded application workload hash is `e3b013960f907b6ec356340d74bcce589235e2484910e8c9e96467763ee21158`. This snapshot includes per-issue field/comment retention, page-exit protection, monotonic reconciliation, and the final Definition-owned local Step factoring. Compiler/server/Node versions, lockfile hash, and benchmark-script hash remain unchanged. The generic matcher and static connected-combination prototypes were removed before this measurement.

| Request after edit         |     Median | Range, three repetitions |
| -------------------------- | ---------: | -----------------------: |
| Binding hover              | 160.710 ms |       151.598–167.790 ms |
| Binding completion         | 148.329 ms |       143.065–154.989 ms |
| Completed Block completion |  12.601 ms |         11.877–19.855 ms |
| Error appearance           | 120.858 ms |       119.019–132.523 ms |
| Error clearing             | 101.332 ms |       100.719–105.791 ms |

All hover/completion contract checks, the deliberate TS2322 title error, and clean restored diagnostics passed. Maximum sampled RSS was 415,776 KiB (406.03 MiB). The existing development server and user-owned watchers remained running; no agent build, test, or other benchmark ran concurrently. The fresh-session sampling and editor-UI limitations above still apply. The workload changed, so these batches do not establish a causal speedup or regression. Raw report: `/private/tmp/workspace-drafts-language-service.json`.

The settled framework passes the full core and UI external emitted-declaration harnesses. All five compiler fixtures pass within their unchanged ceilings:

| Fixture    | Instantiations |   Types |
| ---------- | -------------: | ------: |
| Deep       |        598,458 |  51,482 |
| Wide       |      1,153,551 |  73,796 |
| Commands   |        331,071 |  61,994 |
| Workspace4 |      2,612,524 | 205,924 |
| Workspace8 |      4,445,780 | 279,729 |

Workspace source checking, exact update-channel assertions, all 109 tests across 22 files, and all 20 isolated production browser cases pass. Website and Typing Game source checks also pass. The final build transforms 710 modules and emits 584.09 kB JavaScript (168.44 kB gzip) and 34.20 kB CSS (7.16 kB gzip). The extensionless-config-import and chunk-size warnings remain. Application lint, Effect lint, formatting, and diff whitespace checks pass.

At this historical checkpoint, the full-app TS7056 boundary, static connected-combination guard, and raw matcher channel inference were unresolved framework release findings; their rejected experiments are documented in the [consumer-friction record](workspace-consumer-friction.md). Responsive app editor measurements and passing external framework fixtures do not close those findings.

## Isolated callback guard comparison

The declaration-site callback control described in the [consumer-friction record](workspace-consumer-friction.md#isolated-callback-authoring-guard) was measured with the same three canonical-Step Workspace migrations in both variants. Only the guard and its emitted declaration changed. Three fresh native TypeScript servers per variant ran in baseline/candidate alternation. The native compiler is `7.1.0-beta`, Node is `24.22.1`, the lockfile SHA-256 is `a9828cc4183827876b63141a823a7c833db9726fcb3642e7cd9b2e6fd135b099`, and the profiler SHA-256 is `bb1161e85e202b8582ce8c840ae8b55b575aadb52fca70f37fbac84e061245a6`.

| Post-edit request  |      Baseline median (range) |         Guard median (range) |
| ------------------ | ---------------------------: | ---------------------------: |
| Binding hover      | 171.097 ms (166.992–172.937) | 157.135 ms (149.982–161.743) |
| Binding completion | 152.749 ms (148.339–159.830) | 158.599 ms (158.286–170.464) |
| Block completion   |    13.893 ms (12.817–15.377) |    14.471 ms (13.103–14.730) |
| Error appearance   | 110.890 ms (109.193–123.815) | 120.450 ms (109.494–123.451) |
| Error clearing     | 102.237 ms (101.045–106.432) | 104.102 ms (103.326–109.197) |

All expected contracts, members, the deliberate TS2322 title error, and restored clean diagnostics passed. Maximum sampled RSS was 422,784 KiB baseline and 422,544 KiB candidate. Ranges overlap; these short sessions support no material editor regression, not a causal speedup or a long-session memory claim. No agent build, test, or other benchmark ran concurrently. Raw reports are `/private/tmp/callback-guard-lsp-{baseline,candidate}-{1,2,3}.json` with the aggregate at `/private/tmp/callback-guard-lsp-paired-summary.json`. The control is isolated and unadopted.

## Refined named-interface emission control

The follow-up control adds a same-name exported interface/value pair around each existing checked assembly type. Runtime expressions and the four `FromAssembly*` helpers stay unchanged. The app's eight completed Blocks then emit 79 declarations totaling 4,951,109 bytes. A physically relocated consumer passes with `skipLibCheck: false`. The 16-group graph also emits and relocates successfully, totaling 2,729,343 declaration bytes; the 32-group graph still source-checks but fails TS7056 at its own root producer. This is a specific encoding limit, not a universal Block-count limit.

The four view/OutMessage variants pass focused source and external checks retaining exact Models, Messages, operations, Layer Services/errors, and view contracts. Invalid, `any`, `never`, forged, wrong-Model, and wrong-variant producers remain rejected. Generic UI factories already use named `Completed<...>` interfaces and do not need a separate interface for every invocation. A bounded isolated lint control recognizes an empty same-name interface with exactly one imported checked assembly parent and matching Model/producer; mismatches and widened headers remain rejected. Independent review is still assessing the interface boundary before adoption.

All five original compiler ceilings pass. Deep, wide, and Commands counts match the settled source; Workspace4 becomes 2,530,056 Instantiations / 205,227 Types, and Workspace8 becomes 4,288,508 / 279,072. These counts include only the interface control, not the combined release-blocker prototypes.

Three fresh paired runs per variant used native TypeScript `7.1.0-beta`, the same lockfile, and profiler SHA-256 `30e6deaf6bf4e14c3d785fa3e103aecb7ed20cedc0d54e45c8278be02b338470`. The profiler accepts either the original expanded Assembly hover or the exact named IssueDetailBlock/Route header while still rejecting `any`, `unknown`, and `never`.

| Post-edit request  |      Baseline median (range) |     Interface median (range) |
| ------------------ | ---------------------------: | ---------------------------: |
| Binding hover      | 164.350 ms (163.166–170.993) | 152.809 ms (148.238–159.141) |
| Binding completion | 152.442 ms (142.163–160.545) | 147.246 ms (144.342–157.775) |
| Block completion   |    13.068 ms (12.315–15.347) |    12.786 ms (12.314–14.031) |
| Error appearance   | 120.322 ms (111.184–129.465) | 118.059 ms (110.072–121.359) |
| Error clearing     |  105.400 ms (99.975–105.637) | 100.770 ms (100.665–101.424) |

All expected contracts, completion members, intentional errors, and restored diagnostics passed. Maximum sampled RSS was 421,680 KiB baseline and 420,288 KiB candidate. Overlapping ranges establish no material regression, not a speedup. The first baseline used the prior hover guard and is excluded. Retained reports are `/private/tmp/interface-boundary-lsp-baseline-{2,3,4}.json` and `/private/tmp/interface-boundary-lsp-candidate-{1,2,3}.json`. The complete isolated report is `/private/tmp/foldkit-interface-boundary-review-20261023/REPORT.md`.

The added public interface, changed hover spelling, substantial output size, and remaining root serialization limit need review before a broad migration. Passing this component and the separate callback control does not establish that a combined candidate passes.

Independent review found an additional boundary: an external consumer can deliberately augment the exported interface after emission, narrowing inherited `update` or Service requirements without rechecking the original initializer. Ordinary source assignments to incompatible narrowed interfaces still fail. The existing generic `AssemblyWith*` interfaces also permit module augmentation; the proposed per-feature interface makes a targeted rewrite easier. This is a deliberate ambient-declaration escape, separate from ordinary inferred-channel loss. The header must not be described as a closed or universally equivalent type boundary.

A non-exported backing interface plus exported alias does not provide a replacement: the full Workspace produces 21 TS4023 errors because parent declarations cannot name its private child interfaces. Exporting the backing interface restores emission and its openness. The review preserves this result instead of claiming an internal encoding or a runtime error solves it. Scratch proofs are in `/private/tmp/foldkit-interface-boundary-agent-review` and `/private/tmp/foldkit-private-interface-app-20261023`.

## Combined release-blocker editor gate

The complete isolated candidate combines the validated per-Message update record, producer-derived emission hint, raw/connected callback guard, sound connected-combination check, and named assembly headers. It passes all five unchanged compiler ceilings; the [consumer-friction ledger](workspace-consumer-friction.md#producer-side-emission-hint-control) records counts and the separately failed components. The following measurements test the complete intervention rather than attributing its cost to one component.

The baseline is `/private/tmp/foldkit-interface-boundary-lsp-baseline-20261023`; the candidate is `/private/tmp/foldkit-release-blocker-hint-combined-20261023`. Both contain the same Workspace product behavior. The candidate additionally uses the three canonical-Step update repairs and named completed-Block headers. The baseline retains the original raw callback branches. These are valid pre-change and post-change consumer forms; this comparison does not hold their authoring syntax constant.

Three alternating pairs (B1/C1/B2/C2/B3/C3) each use fresh native TypeScript servers, `7.1.0-beta`, Node `24.22.1`, the same lockfile SHA-256 `a9828cc4183827876b63141a823a7c833db9726fcb3642e7cd9b2e6fd135b099`, and identical profiler SHA-256 `30e6deaf6bf4e14c3d785fa3e103aecb7ed20cedc0d54e45c8278be02b338470`. Agent compiler/test jobs were paused; existing user watchers and editor remained open and idle. Workload hashes remained stable within each variant: baseline `e3b013960f907b6ec356340d74bcce589235e2484910e8c9e96467763ee21158`, candidate `9a31ad0bcb23c5b6c8686fed3cfa31cf8efd11e805f4aa23dd21b9e108850dec`.

| Post-edit request  |      Baseline median (range) |      Combined median (range) |
| ------------------ | ---------------------------: | ---------------------------: |
| Binding hover      | 166.264 ms (150.613–168.306) | 162.726 ms (151.149–173.823) |
| Binding completion | 143.438 ms (139.971–158.807) | 146.751 ms (142.132–146.982) |
| Block completion   |    12.962 ms (12.249–20.681) |    13.184 ms (12.595–13.767) |
| Error appearance   | 114.239 ms (107.951–119.236) | 108.076 ms (106.703–110.292) |
| Error clearing     | 117.284 ms (103.160–123.945) | 113.038 ms (103.725–115.870) |

All expected hover contracts, completion members, intentional TS2322 errors, and restored clean diagnostics pass. The overlapping latency ranges establish no material regression in these bounded workflows; they do not demonstrate a speedup. The median per-run maximum sampled RSS increases from 408,848 KiB to 437,984 KiB (about 28.5 MiB, 7.1%). Individual maxima range from 403,072–411,504 KiB baseline and 437,856–440,784 KiB candidate. This is a repeatable modest memory cost, not a zero-cost change. Sampling is every 250 ms during short sessions; it does not establish long-session retained heap behavior or capture every instantaneous peak.

Native API checks also verify that actual consumer IntelliSense exposes `makeUpdate.withContext` and the method documentation attached to both authoring forms. The first documentation probe caught the record explanation being attached only to its exported type alias; moving it onto the Composition property repaired the actual native symbol documentation. The passing report is `/private/tmp/record-update-native-intellisense.json`.

Raw paired reports are `/private/tmp/combined-boundary-lsp-{baseline,candidate}-{1,2,3}.json`; the aggregate is `/private/tmp/combined-boundary-lsp-paired-summary.json`. The candidate remains isolated and unadopted pending the public authoring/header review. Website and other identified callback migrations have not been performed, so these numbers are Workspace results, not a claim about a fully migrated Website or a new published preview.
