# Integrated framework performance

## Final initialization and testing candidate

Three alternating paired native TypeScript 7 runs compare the pre-initialization
checkpoint (`1d92c2ca0f5a` application cleanup with earlier framework artifacts)
with final implementation `1b89a2325553`. Both use identical current driver bytes,
equivalent operation probes and package-local TypeScript 7 declaration builds.
All twelve sessions pass their hover, completion and diagnostic payload checks.
This is the combined delta, not an isolated causal measurement of one helper.

| Workflow                                   | Baseline median (range), ms | Candidate median (range), ms |
| ------------------------------------------ | --------------------------: | ---------------------------: |
| Workspace post-edit Binding hover          |               275 (260–279) |                280 (258–289) |
| Workspace post-edit Binding completion     |               271 (264–291) |                276 (258–282) |
| Workspace completed Block completion       |                  57 (47–64) |                   49 (46–61) |
| Workspace error appearance                 |               201 (200–208) |                202 (201–206) |
| Workspace error clearing                   |               179 (177–189) |                178 (175–182) |
| Website post-edit Binding hover            |               220 (212–265) |                236 (214–242) |
| Website post-edit Binding completion       |               224 (224–227) |                236 (228–243) |
| Website ordinary completion                |                  15 (15–15) |                   21 (19–21) |
| Website error appearance                   |               594 (585–659) |                569 (566–580) |
| Website error clearing                     |               607 (606–612) |                585 (574–586) |
| Website cold completed-root Message access |         2,838 (2,809–2,942) |          2,771 (2,740–2,833) |

Workspace's bounded sampled peak server RSS is 434 MiB baseline and 444 MiB
candidate. Website does not have a memory sampling result in this driver. The
aggregation initially assumed both workloads did; all twelve valid raw sessions
were retained and summarized with absent sampling stated explicitly. No timing
rerun or result selection was used to repair the summary.

These measurements support retaining the final delta. Small ordinary completion
costs remain usable; no material overall incremental regression or broad causal
speedup is established. The roughly 2.8-second cold completed-root cost, actual
Neovim behavior, long-session memory and unlimited graph scaling remain outside
this bounded result. The separately tested optional tsrs setup remains a useful
editor option; official TypeScript remains the source and CI contract.

All six compiler fixtures pass. Original ceilings are unchanged, including
Workspace four/eight-group Types of 205,020/278,605 against 206,314/280,523. The
new 100-distinct-Subscription fixture stays at its initial 548,398 instantiations
and 24,566 Types. Actual Workspace root emission and strict relocation pass with
115 declarations totaling 13,222,561 bytes; declaration size remains a cost.

Evidence: `/private/tmp/foldkit-release-ready-20261025/native/summary.json`,
its twelve raw reports, `verification/compiler-budgets.log`, and
`workspace-declarations/results.json`. The
[final preparation report](preview-ready-20261025.md) records installed-consumer
and runtime results separately. Earlier sections retain their own source pins.

### Runtime comparison with the published preview

Four balanced rotating rounds compare published `1f6776fa7ece` with final
`1b89a2325553` on Chrome 155.0.8059.85 and harness
`03fff17ad22407115a91937ddab680e40fe0c7c7`. All four builds pass the independent
Todo behavior verifier before timing. Each run preserves cross-origin isolation
and the same 400 synchronous/400 animation-frame callback counts.

| Variant   | Published median (range), ms | Candidate median (range), ms | Median change |
| --------- | ---------------------------: | ---------------------------: | ------------: |
| Naive     |          560.3 (473.3–594.2) |          564.0 (525.8–606.1) |         +0.7% |
| Optimized |          266.1 (254.6–286.4) |          256.4 (217.0–280.3) |         −3.6% |

Ranges overlap. This bounded DOM/update screen establishes no material runtime
regression or general causal speedup. Instrumented execution time excludes
waiting; it is not end-to-end interaction latency. Candidate JavaScript adds
7,721 raw bytes, and gzip adds 1,625 naive / 1,636 optimized bytes. Both builds
resolve Foldkit and its Vite plugin from their own snapshots.

Raw rounds, bucket totals, correctness logs, bundle hashes and resolved package
paths are in `/private/tmp/foldkit-release-ready-20261025/runtime/`. No compiler
ceiling or timeout was increased. User servers were left running; no other
agent build/test job ran during editor or runtime timing.

## October 25 testing and storage followups

The subsequent frozen source is `d7d06ee6c4d7b9be56a1803985be01bce0ca58a9a6466266df72fee4d47866df`, comprising 6,902 files after excluding generated build/cache outputs and `examples/vite.aliases.d.ts`. It follows committed `679d2d5e7f`; final internal evidence addenda do not alter its package-producing source. The four changes and acceptance results are recorded in [final followups](preview-final-followups-20261025.md).

Three fresh Website runs and three Workspace runs use the unchanged driver `477b7ad3e1ab1c82ad5ef43d5b49cdcfe75669d782b5ae9caa3725bd472ff48e`, official native TypeScript `7.1.0-beta`, Node `24.22.1`, and the existing 60-second request timeout. Agent builds and tests were held during the timing window. Typed hover, nonempty expected completions, definition, deliberate error and restored-clean diagnostic assertions pass. These are native server request measurements, excluding editor UI and tsrs.

| Workflow                                        | Median ms |            Range ms |
| ----------------------------------------------- | --------: | ------------------: |
| Website changed-URL Binding hover after edit    |   239.439 |     219.994–256.473 |
| Website Binding completion after edit           |   226.794 |     204.374–244.362 |
| Website definition after edit                   |   239.977 |     237.464–248.067 |
| Website error appearance                        |   616.063 |     604.993–648.285 |
| Website error clearing                          |   611.157 |     605.674–671.317 |
| Website completed root Message, cold            | 3,039.088 | 2,959.775–3,044.748 |
| Workspace Binding hover after edit              |   278.186 |     273.870–285.403 |
| Workspace Binding completion after edit         |   270.952 |     254.775–272.541 |
| Workspace completed Block completion after edit |   789.505 |     787.972–824.650 |
| Workspace error appearance                      |   206.307 |     200.630–209.005 |
| Workspace error clearing                        |   183.370 |     180.519–183.666 |

The maximum sampled Workspace server RSS is 591,504 KiB, about 578 MiB. These bounded fresh sessions do not establish long-session stability. Cold Website root access remains expensive. Its separate preceding-checkpoint median was 2,796 ms; the new 3,039 ms result cannot by itself establish a causal followup regression across different sessions.

That difference triggered one bounded batch of three alternating cold-constructor pairs against an independently rebuilt exact `679d2d5e7fae638f7aa0dbce65440da0ce767331` control. Both use the identical driver/compiler, snapshot-local package artifacts and the same external dependency realpaths; Website source checking passes for the control. Source and artifact fingerprints remain unchanged across the batch. Completed-root medians are 2,951.890 ms for the control and 2,924.985 ms for the followups, with overlapping ranges of 2,916.281–2,953.648 and 2,917.238–2,940.547 ms. Local constructor medians are 321.115 and 303.136 ms, also with overlapping ranges. This bounded comparison demonstrates no material incremental regression or causal speedup. Investigation stops at this predeclared batch; the roughly three-second cold-root limitation remains.

All five existing compiler ceilings pass without increases: deep 589,591 instantiations / 50,942 Types; wide 1,150,837 / 73,038; Commands 329,540 / 61,630; Workspace four groups 2,509,102 / 205,737; eight groups 4,248,222 / 279,546. The tiny Workspace increases arise from the private Mount guard. The optional variant helper's separate Auth cost and bounded scaling comparison remain disclosed in [its assessment](variant-binding-assessment.md#compiler-and-maintenance-cost).

The earlier runtime/bundle comparison retains its own `679d2d5e7f` scope; it is not presented as a fresh execution of this delta. The current changes add an optional Binding adapter and test APIs, without changing production Runtime scheduling. Raw current native reports, fingerprints and summary are under `/private/tmp/foldkit-followup-native-final-20261025/`; compiler evidence is `/private/tmp/foldkit-followup-budgets-final-20261025.log`. No claim of universal responsiveness or unlimited declaration scaling follows from these gates.

## October 25 final candidate

All 53 repository source configurations, core/UI emitted-declaration and strict relocation harnesses, independent channel/registration controls, and all five unchanged compiler ceilings pass. The actual expanded Workspace root emits 110 declarations through its measured private boundary. The packed Coverchart and SPA/SSG/SSR rehearsals and 32 Workspace browser cases pass. [Current handoff and artifact scope](next-preview-release-handoff.md).

### Native editor comparison

Three alternating pairs compare the final candidate with published `1f6776fa7ececa766188df5201eefec6ba781b5d` using Node 24.22.1 and official native TypeScript 7.1.0-beta. Both roots use the identical driver SHA-256 `477b7ad3e1ab1c82ad5ef43d5b49cdcfe75669d782b5ae9caa3725bd472ff48e`. The control’s product source is unchanged. The current Workspace Schema fragments and immediate Binding erasure controls pass seven focused driver tests and independent review. Preliminary runs using the older target guard are excluded.

| Website workflow                   | Published median | Candidate median | Published range | Candidate range |
| ---------------------------------- | ---------------: | ---------------: | --------------: | --------------: |
| Post-edit route-handler hover      |         239.9 ms |         235.0 ms |     211.5–254.8 |     223.3–256.4 |
| Post-edit Binding completion       |         209.2 ms |         216.6 ms |     200.6–252.4 |     207.2–220.3 |
| Post-edit definition               |         231.8 ms |         232.1 ms |     215.4–234.5 |     230.4–257.8 |
| Post-edit route-field completion   |          20.8 ms |          23.4 ms |       15.0–24.9 |       13.9–25.1 |
| Error appearance                   |         561.2 ms |         617.6 ms |     547.6–612.7 |     586.9–659.6 |
| Error clearing                     |         530.3 ms |         586.9 ms |     519.5–535.3 |     585.6–588.6 |
| Cold completed-root Message access |       2,446.3 ms |       2,796.1 ms | 2,441.5–2,492.3 | 2,789.7–2,845.7 |

Hover, completion and definition ranges overlap. Error/clear adds approximately 56 ms, and cold root Message access adds approximately 350 ms (14.3%); every cold pair is slower. Independent review accepts this disclosed preview tradeoff, consistent with the prior accepted cost, without treating different historical runs as a causal speedup. Official TypeScript latency is not solved.

Three fresh runs of the current expanded Workspace measure post-edit Binding hover at 266.0 ms, Binding completion at 260.0 ms, completed Block member completion at 773.0 ms, and error appearance/clearing at 197.9/178.6 ms. Ranges are 255.2–272.6, 247.1–278.7, 770.8–776.9, 195.6–201.0, and 174.8–182.5 ms. The maximum sampled server RSS is 594,400 KiB (about 580 MiB). This is a bounded fresh-session sample, not a long-session memory bound. No equivalent published Workspace graph exists; the older smaller-workload numbers are not a paired comparison.

The optional tsrs guide records a separate tested Neovim option. These latest numbers measure official TypeScript only. Neither those older tsrs benchmarks nor the user’s positive editor experience proves an exact speedup for this candidate.

Evidence: `/private/tmp/foldkit-next-preview-benchmark-20261025/final-native-summary.json`, individual request reports, preflight, driver hashes, and `guard-change.json`. The four rotating runtime rounds below are complete.

### Runtime and artifact comparison

All four production TodoMVC variants pass add, toggle, destroy, edit, filter, toggle-all and clear-completed correctness before timing. Four rotating rounds place each variant once in every ordinal position. Chromium is 153.0.8010.12. The metric sums instrumented event/callback execution, including DOM updates; it is not elapsed interaction latency or paint/frame time.

| Variant   | Published median | Candidate median | Published range | Candidate range |
| --------- | ---------------: | ---------------: | --------------: | --------------: |
| Naive     |        598.15 ms |        611.65 ms |     515.3–729.2 |     554.3–626.8 |
| Optimized |        258.75 ms |        276.05 ms |     253.6–291.0 |     243.7–293.6 |

The observed median increases are 2.3% and 6.7%, with overlapping ranges. This bounded four-round screen establishes no material user-facing regression or general framework ranking; it does not prove zero runtime cost. The optimized aggregate difference is about 17 ms across the complete add/toggle/delete workload.

Naive JavaScript grows 403,594→411,158 bytes (gzip 126,994→128,570); optimized grows 410,208→417,772 bytes (gzip 128,345→129,923). Both add 7,564 raw bytes and about 1.6 KB gzip. Exact bundles, source/dependency realpaths, rotating order, all samples and pre/post core-source hashes are retained in `/private/tmp/foldkit-next-preview-benchmark-20261025`. The benchmark uses ports 43927/43928 and leaves the Workspace server on 45961 untouched.

The clean packed nine-package rehearsal already excludes the removed `handlersLayer` module. A force-built shared dist retained three stale generated files; these were archived and removed after native timing. No current source/public export referenced them. Final artifact comparison confirms equal JS/declaration paths, exact UI bytes and semantically identical Foldkit runtime/declaration ASTs. Post-format map differences are recorded separately. Existing declaration maps omit original TS sources in tarballs; this is an inherited navigation limitation, not a new contract failure. [Artifact comparison](/private/tmp/foldkit-inclusive9-rehearsal-20261024/final-dist-comparison.json).

## October 23 disposition

The approved handler-record/context updates, canonical mixed-result checks, connected OutMessage protection, and named public UI headers are integrated. Correctness, source checks, emitted declarations, runtime tests, and all five unchanged compiler budgets pass.

The first October 23 benchmark completed before the queued Workspace UI changes and the later internal declaration repair. It found no demonstrated runtime regression and similar Workspace editor latency. Website post-edit hover added about 42 ms and cold completed-root Message constructor access added about 483 ms. Those Website differences were repeatable. The final post-change benchmark is recorded separately; earlier numbers do not describe the later candidate merely because the date matches.

Two bounded consumer controls did not recover that cost. A named Website root interface and an aggregate root update callback both left cold completed-constructor access near three seconds with overlapping ranges. Neither justifies a shared consumer change. Retain the approved record API and its exact per-Message contracts rather than adding ceremony without a demonstrated benefit.

## Measured snapshots and tools

- Candidate: working tree on `codex/workspace-example`, based on `31d8aad9fe4555112b3cf8e2d948badeee9ced0d`, before subsequent Workspace polish. It is not an immutable released commit.
- Control: optimized pre-adoption snapshot at `/private/tmp/foldkit-interface-boundary-lsp-baseline-20261023`. It is not the published preview.
- Node `24.22.1`, native TypeScript `7.1.0-beta`, macOS arm64.
- Lockfile SHA-256: `a9828cc4183827876b63141a823a7c833db9726fcb3642e7cd9b2e6fd135b099`.
- Editor driver SHA-256 at measurement: `8b973068ccd0bbd8ab67df1b4f1c0e281ba7c444457a142d479c94bb69b1fbda`.
- Compiler budget SHA-256: `2640978313d22fc3224ef85edebd6bf7e827b4a3f67124fd7d92bb713a19c385`.

The editor control initially lacked Website dependency links. Recreate its local workspace links and use the same external dependency realpaths, rebuild its own core/UI declarations, and require clean Website source checking before comparison. The malformed-control attempts were discarded. The hover guard accepts either expanded or abbreviated TaggedUnion display while retaining exact Binding/header/field and non-erasure checks; its regression test is mutation-checked.

## Runtime and DOM update workload

Production naive and optimized TodoMVC builds use the existing Vite plugin and `internal/lustre-benchmark` driver. The upstream harness is pinned to `03fff17ad22407115a91937ddab680e40fe0c7c7`; Chromium is `153.0.8010.12`. Six rotating rounds balance six implementations across every ordinal position. All four Foldkit slots pass add, toggle, destroy, edit, filter, toggle-all, and clear-completed correctness checks before timing.

The workload adds 100 todos, toggles each, then deletes all 100. Values are the sum of instrumented event/callback execution time, including DOM update work. They are not elapsed interaction latency, browser paint time, or frame-rate measurements. CSS is stubbed identically. Each sample has a fresh browser context.

| Implementation              | Median ms | Sample range ms |
| --------------------------- | --------: | --------------: |
| Foldkit control             |     612.6 |     349.9–666.0 |
| Foldkit candidate           |     498.7 |     339.4–586.9 |
| Foldkit control optimized   |     249.7 |     179.3–319.9 |
| Foldkit candidate optimized |     246.8 |     198.7–363.7 |
| Elm 0.19.1 optimized        |     124.4 |      85.0–172.1 |
| React 19.1.0 optimized      |     265.7 |     151.9–351.5 |

The host had intermittent user editor activity. Ranges overlap substantially, so these results support no demonstrated candidate regression, not a causal speedup or a general framework ranking. The existing larger public benchmark table describes its prior batch and is not replaced by this six-slot comparison.

Candidate JavaScript adds 361 raw bytes in each variant: naive 403,597→403,958 bytes, optimized 410,211→410,572 bytes. Gzip adds 91 and 84 bytes respectively. An initial control build resolved the Vite plugin's installed Foldkit identity to a different checkout than its source aliases; it was corrected and discarded before any timing. The installed manifest records exact bundle hashes and dependency resolutions.

## Native editor workflows

Three alternating paired runs use the same driver/compiler/lockfile. Requests require nonempty typed hovers, expected completions, deliberate TS2322 errors at the exact changed property, and clean restored diagnostics. Edits stay in server memory. All validation checks pass.

| Post-edit workflow                          | Control median ms | Candidate median ms |
| ------------------------------------------- | ----------------: | ------------------: |
| Workspace Binding hover                     |           168.690 |             172.327 |
| Workspace Binding completion                |           153.849 |             145.655 |
| Workspace completed Block completion        |            12.721 |              15.172 |
| Workspace error appearance                  |           105.887 |             108.652 |
| Workspace error clearing                    |           109.653 |             112.653 |
| Website Binding hover in changed URL        |           222.915 |             265.195 |
| Website Binding completion                  |           228.816 |             256.248 |
| Website go-to-definition                    |           243.169 |             270.306 |
| Website narrowed Route completion           |            18.673 |              19.751 |
| Website error appearance                    |           567.060 |             573.267 |
| Website error clearing                      |           555.858 |             572.263 |
| Website completed Message constructor, cold |         2,438.725 |           2,921.405 |

Workspace ranges overlap. Maximum sampled server RSS is 416,272→419,360 KiB, an increase of 3,088 KiB, about 3 MiB or 0.74%. Sampling can miss peaks. Website cold completed-constructor ranges do not overlap: 2,426–2,440 ms versus 2,900–2,929 ms. Changed-URL hover also increases across these three samples. Do not describe the entire editor result as unchanged.

These are direct official native language-server measurements, not a tsrs comparison or an editor UI timing. Existing user editors/watchers remained available; no agent build, test, or other benchmark ran concurrently. Short fresh sessions do not establish long-session memory stability.

Workload SHA-256 values:

| Workload  | Control                                                            | Candidate                                                          |
| --------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Workspace | `e3b013960f907b6ec356340d74bcce589235e2484910e8c9e96467763ee21158` | `ef69a8d9ffa260d7f73fd60a9f6b03ed123c14c92475c161896a3ecef0776862` |
| Website   | `a909683cb3ab9e8524abe16659f68549d71752d6f0c08e6ca3261fd6e1e26839` | `3b1456fc41c63afa6862b11e2e127ede4379bccb9f9834a1b7ee0f5cb8e0c639` |

### Bounded consumer controls

Both controls use a source-checked isolated current-candidate snapshot and three alternating cold-constructor pairs. Each preserves all other relevant source/declaration files.

| Control                           |       Current median / range ms |   Alternative median / range ms |
| --------------------------------- | ------------------------------: | ------------------------------: |
| Named root interface              | 3,066.599 / 2,898.587–3,101.660 | 2,979.949 / 2,941.612–3,663.412 |
| Canonical aggregate root callback | 3,057.052 / 2,975.211–3,170.942 | 2,932.528 / 2,764.241–3,273.823 |

The callback control uses Definition-owned local Steps and intact connected results without casts or return annotations. The root has no exposed operations. It adds local construction/application ceremony and aggregate output typing without recovering a clear gain. Neither control was adopted, and neither isolates the cost solely to the root header or root record.

## Compiler and declaration checks

Fixture totals subtract the common baseline. Budget files and workload sizes are unchanged.

| Fixture                | Control Instantiations / Types | Candidate Instantiations / Types |
| ---------------------- | -----------------------------: | -------------------------------: |
| Deep eight             |               598,458 / 51,482 |                 605,086 / 52,004 |
| Wide hundred           |             1,153,551 / 73,796 |               1,155,728 / 74,181 |
| Commands two hundred   |               331,071 / 61,994 |                 332,535 / 62,380 |
| Workspace four groups  |            2,530,056 / 205,227 |              2,547,769 / 204,439 |
| Workspace eight groups |            4,288,508 / 279,072 |              4,331,309 / 279,180 |

The real Workspace root emits 79 declaration files totaling 4,343,995 bytes. External four/eight-group scale fixtures emit five files totaling 1,745,505 bytes. Relocated consumption of both passes with `strict: true` and `skipLibCheck: false`. Source and emitted acceptance/rejection harnesses cover exact Models/Messages, operations, requirements/errors, registration, context, and view/OutMessage distinctions. The 32-group synthetic root's TS7056 limit remains documented; these successes do not establish unlimited library serialization.

## Expanded Workspace verification

After the required pre-polish benchmark, the issue editor gained four registered Listbox controls and Comment Composer moved to a record update. The application passes 111 tests, 20 browser cases, source checking, production build, and strict feature declaration emission with relocated accepted/rejected consumers. The reporting operation now has no Commands and emits exactly the child's `ReportedDraft`; its parent fold remains conservatively typed across all fold cases.

At this checkpoint, the larger full root failed declaration emission with TS7056 at `prepare`. The app's actual `noEmit` source configuration and production runtime passed, and the reusable Issue Detail feature emitted. Named-child and editor-update controls did not recover full-root emission. A keyed-instance sketch failed contextual configuration inference before establishing a valid comparison, so it supplies no language-impossibility or performance claim. The subsequent internal repair below preserves the four direct property relationships.

A final three-run native Workspace smoke passes typed hover/completion and exact TS2322 appearance/clearing on workload `fa23247036a238fe3e0bc6d4dd0992f24faf57b69ec5b361acde6e77efb18d05`. The driver hash is `2f040354fa1d95582e1b8d8496acdb907dca5935fd8725aa9dc1d8e565347098`; its only change since the paired benchmark is formatting an unchanged array literal. Tools and lockfile are unchanged.

| Expanded Workspace workflow          | Median ms |        Range ms |
| ------------------------------------ | --------: | --------------: |
| Post-edit Binding hover              |   280.817 | 279.008–284.672 |
| Post-edit Binding completion         |   269.546 | 257.088–279.028 |
| Post-edit completed Block completion |    46.317 |   42.257–52.808 |
| Error appearance                     |   220.869 | 218.371–327.638 |
| Error clearing                       |   196.936 | 194.822–461.387 |

Maximum sampled RSS is 472,368 KiB, about 461 MiB. This is a larger functional graph than the paired pre-polish workload; it does not establish a causal framework speedup or regression. Its bounded native sessions do not prove long-session stability. Raw report: `/private/tmp/foldkit-workspace-polished-language-service-20261023.json`.

## Named contract serialization repair

Two internal interfaces retain the existing completed dual-update signatures and owned Document view contract. The exact context tuple, output channels, owner invariance, and graph/view evidence remain unchanged. Both names are necessary for the expanded Workspace reproduction: the original and either boundary alone fail full-root serialization. This is a repair to that encoding, without a consumer API change or a storage redesign.

The repaired application emits 80 declaration files totaling 7,000,351 bytes, including its four real Listbox children. Strict relocated accepted/rejected consumers pass. Core source/build and its full declaration harness, UI source/build and external declaration harness, and all five unchanged compiler ceilings pass. All 280 emitted core JavaScript files are byte-identical to the control. Independent review found no inference, variance, safety, or declaration-portability objection.

The previously documented 32-group aggregate-operation fixture still reaches TS7056 at its private `prepare`. This repair establishes the real Workspace result, not unlimited serialization. Shorter output and passing count budgets alone establish no editor speedup; final native requests are measured after integration.

Evidence: `/private/tmp/foldkit-workspace-root-expansion-20261023/`, including the exact patch, baseline/single-boundary controls, source/emitted/relocated checks, JavaScript comparison, and larger fixture log.

## Local evidence

- Runtime samples: `/private/tmp/foldkit-preview-runtime-results-20261023.log`; bundle manifest: `/private/tmp/foldkit-preview-runtime-manifest-20261023.json`.
- Native raw reports: `/private/tmp/foldkit-integrated-{workspace,all}-{control,preview}-{1,2,3}-20261023.json`; aggregate: `/private/tmp/foldkit-integrated-editor-summary-20261023.json`.
- Control validity/fingerprints: `/private/tmp/foldkit-control-website-validity-20261023.json`.
- Consumer controls: `/private/tmp/foldkit-website-root-{header,callback}-summary-20261023.json`.
- Compiler logs: `/private/tmp/foldkit-integrated-compiler-{control,preview}-20261023.log`.
- Declaration configs, output and logs: `/private/tmp/foldkit-integrated-declarations-20261023`.

## Final post-change benchmark

The final run includes the expanded property-control graph, shared control styles, DevTools record-update migration, and the two internal declaration interfaces. The production snapshot is the same locally packed source identified by digest `6958eee7b2cfb5c6cbb76e72d138a2acadad793285aa8f8e4fc7b9243797afbb`. It is still an uncommitted candidate, not an npm release.

This comparison uses the actual published source `1f6776fa7ececa766188df5201eefec6ba781b5d`, not the earlier optimized pre-adoption control. Its own core, UI, DevTools, Markdown, and Vite plugin were rebuilt with the pinned native compiler; its Website source check passes. Workspace dependencies resolve within each snapshot, and external dependency realpaths are shared. The published lockfile remains unchanged; the candidate adds the Workspace importer. Setup attempts with malformed dependency links or build order were excluded before measurements.

### Final native editor measurements

Three alternating Website pairs use the identical driver, native TypeScript `7.1.0-beta`, Node `24.22.1`, and 60-second request timeout. All typed hover, member completion, go-to-definition, deliberate TS2322, restored-clean diagnostics, source-restoration, and server-identity checks pass. No agent build, test, or runtime benchmark ran concurrently; existing user editor/watchers and the requested development server remained available.

| Website workflow                         | Published median ms | Final candidate median ms |
| ---------------------------------------- | ------------------: | ------------------------: |
| Post-edit Binding hover in changed URL   |             248.942 |                   270.214 |
| Post-edit Binding member completion      |             236.869 |                   262.323 |
| Post-edit go-to-definition               |             258.343 |                   267.690 |
| Post-edit narrowed Route completion      |              17.672 |                    18.468 |
| Error appearance                         |             568.767 |                   575.492 |
| Error clearing                           |             553.915 |                   654.034 |
| Completed root Message constructor, cold |           2,533.716 |                 3,003.959 |

Cold root-constructor access adds 470 ms, about 18.6%. Its ranges do not overlap: 2,522–2,704 ms versus 2,955–3,440 ms. Changed-URL hover adds 21 ms with nonoverlapping ranges; error clearing adds 100 ms with nonoverlapping ranges. Completion and definition ranges overlap. These results retain a measurable editor cost; passing correctness and count budgets does not remove it. The earlier named-root and aggregate-callback controls did not demonstrate a recovery that justified adopting them.

The expanded Workspace did not exist in the published preview, so it is measured separately, without a fabricated paired comparison:

| Expanded Workspace workflow          | Median ms |        Range ms |
| ------------------------------------ | --------: | --------------: |
| Post-edit Binding hover              |   283.348 | 281.432–295.885 |
| Post-edit Binding completion         |   275.782 | 273.192–279.000 |
| Post-edit completed Block completion |    42.416 |   41.462–56.292 |
| Error appearance                     |   223.651 | 212.479–235.241 |
| Error clearing                       |   197.993 | 193.544–398.772 |

Maximum sampled native-server RSS is 473,680 KiB, about 463 MiB. Sampling can miss short peaks; these fresh bounded sessions do not establish long-session memory stability. The editor driver excludes editor UI, editor plugins, and tsrs. Do not extrapolate its numbers to every application or a user's reported wall-clock delay.

Fingerprints and raw measurements are in `/private/tmp/foldkit-next-preview-benchmark-20261023/final-native-results.json` and `final-native-summary.json`. The identical driver SHA-256 is `2f040354fa1d95582e1b8d8496acdb907dca5935fd8725aa9dc1d8e565347098`. Published Website workload SHA-256 is `4743fae0c8623634f7d6cae4abe5937f1a2d632fa3a07bce34fb69fc60989fd9`; candidate Website is `5037408b987ea2ceadd527b56d5ffb64a9bb306f77d7266ba4e986bca4fb7a36`; expanded Workspace is `e0ccae9baf70a06bf5c15fb889bf71c26d21d4b379b4900e15b793aabf9a706d`.

### Final runtime and bundle measurements

Fresh naive and optimized builds of published `1f6776fa7ece` and the final candidate resolve Foldkit and the Vite plugin's Foldkit dependency to their own snapshot. The pinned harness and Chromium versions are unchanged. All four variants pass the complete TodoMVC correctness check before timing.

The temporary orchestration process reached its 300-second wall-clock limit before completing the planned eight rounds. Retain only the first four complete rotating rounds, in which each variant occupies each ordinal position once. This cutoff was chosen from the balance structure before inspecting timings; all six samples from the incomplete second block are discarded. The complete 16 retained samples and discarded samples remain in the raw log. The timeout is a tooling limit, not an application correctness failure; the benchmark server and browser were confirmed stopped.

| Implementation              | Median ms |    Range ms |
| --------------------------- | --------: | ----------: |
| Published Foldkit naive     |     457.6 | 407.3–494.4 |
| Final candidate naive       |     445.7 | 358.3–502.3 |
| Published Foldkit optimized |     232.8 | 222.2–251.3 |
| Final candidate optimized   |     219.1 | 188.1–270.5 |

This bounded screen shows no demonstrated material runtime regression. Overlapping ranges and four samples do not establish equivalence or a causal speedup. Values measure instrumented JavaScript/event/callback and DOM update work, not wall-clock interaction latency, paint, or frame rate. No external-framework ranking follows from this comparison.

Final JavaScript is 403,958 bytes naive and 410,572 optimized, versus 403,594 and 410,208 for the actual published source. Each adds 364 raw bytes; gzip adds 93 and 85 bytes. Raw results, the four-round summary, exact bundle hashes, snapshot resolutions, and correctness logs are under `/private/tmp/foldkit-next-preview-benchmark-20261023/` as `final-runtime-results.log`, `final-runtime-summary.json`, `runtime-bundles.json`, and `runtime-verify-*.log`.

### Final compiler and declaration gates

All five unchanged compiler ceilings pass after the final source freeze:

| Fixture                | Instantiations delta | Types delta |
| ---------------------- | -------------------: | ----------: |
| Deep eight             |              605,194 |      52,034 |
| Wide hundred           |            1,155,836 |      74,203 |
| Commands two hundred   |              332,643 |      62,402 |
| Workspace four groups  |            2,547,977 |     204,490 |
| Workspace eight groups |            4,331,509 |     279,239 |

The declaration repair above remains source- and emitted-checked, mutation-checked against both individual removals, and strict-relocated. The full expanded application emits 80 files totaling 7,000,351 bytes. All 280 core runtime JavaScript files are unchanged by that repair. The 32-group synthetic `--save-all` serialization limit remains. Passing these fixtures establishes neither a universal graph-size threshold nor long-session editor responsiveness.

### Final preparation disposition

Retain the approved API and exact safety checks. Independent review accepts the measured editor cost as an explicit preview tradeoff, including the now-clear 100 ms error-clearing increase. The roughly 470 ms cold completed-root cost reproduces the earlier comparison; no bounded control demonstrated a better consumer change. Do not present the next preview as resolving all TypeScript latency.

Local preparation is complete, with the limitations above and the separate security review recorded in the handoff. The candidate is not published or marked Ready. Final user approval, an exact reviewed integration commit, registry acceptance, immutable deployment verification, and the generated public release handoff remain separate gates.

## October 24 declaration feedback addendum

The latest migration report exposed Effect DateTime ViewInputs rejection and lost OutMessage inference after dynamic/nested connected Step combinations. Both are verified in the prepared candidate. The DateTime repair adds a type-only Inspectable protocol exemption; the existing data-first `NoInfer` repair already covers the combined-Step report. Added callbacks, exact channels, registration, and handler completeness remain checked in source and emitted declarations.

Three paired native runs against the preceding prepared candidate show no material incremental regression. Website Binding hover is 272.025→268.552 ms, Binding completion 258.817→258.560 ms, error appearance 591.626→566.944 ms, error clearing 593.625→595.323 ms, and cold completed Message access 2,904.821→2,925.826 ms. Workspace hover/completion is 281.145/270.904 ms after the fix. Sampled Workspace RSS is 460,640→474,896 KiB. These bounded sessions do not establish long-session stability or remove the published-baseline costs recorded above.

All five compiler counts are identical to the preceding candidate. All 449 packed production JavaScript files and 709 CLI templates are byte-identical, so the earlier runtime benchmark and consumer browser results transfer explicitly rather than being reported as fresh reruns. New packed declarations and all four installed consumer source checks pass. [Full incremental report, frozen digest, paired measurements, mutation proofs, and evidence](preview-type-feedback-20261024.md). Publication remains on hold.
