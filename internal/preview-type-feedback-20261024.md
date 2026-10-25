# October 24 preview declaration feedback

## Disposition

Both type-level problems in [the latest migration report](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6384975056) are resolved in the prepared next-preview candidate. No additional public API shape or consumer migration is required for these fixes. Publication remains on hold for the user's approval; the published Ready snapshot is still `1f6776fa7ececa766188df5201eefec6ba781b5d`.

The fresh local artifact source digest is `f89c6afa2fb1a1f8fbe82717217c4243c7ad29cee3629e186b43d322a9090ec3`, based on Git HEAD `31d8aad9fe4555112b3cf8e2d948badeee9ced0d` plus uncommitted work. This digest identifies a frozen local source copy, not a release commit or npm canary version. Subsequent verification-fixture and documentation changes are recorded separately and do not change its production artifacts.

## Effect DateTime in ViewInputs

The validator now excludes the standard `Inspectable` protocol keys when traversing an Inspectable value, alongside the existing Pipeable and native Date exclusions. Effect `DateTime.Utc`, `DateTime.Zoned`, and `DateTime.TimeZone` values are accepted as data through nested records, arrays, tuples, and `Option`. No conversion to strings or numbers is needed.

Added application callbacks remain invalid. Rejection fixtures cover callback-bearing DateTime and Inspectable extensions, unsafe union branches, arrays, and Option payloads. Diagnostic assertions preserve the offending field path. The published Effect declarations omit the internal named-time-zone formatter, so no broad exemption for `Intl` objects or opaque values was added.

The structural check cannot distinguish an own override of a protocol method from its normal implementation. Runtime validation continues rejecting enumerable own function fields. This is the same boundary as the existing Date and Pipeable treatment.

Coverage lives in [ViewInputs runtime tests](../packages/foldkit/src/html/viewInputs.test.ts) and the [accepted](../packages/foldkit/declaration-tests/view-inputs.accepted.ts), [rejected](../packages/foldkit/declaration-tests/view-inputs.rejected.ts), and [external consumer](../packages/foldkit/declaration-tests/view-inputs.consume.ts) declaration fixtures. Against the preceding built package, the accepted external fixture fails emission with nested `toJSON`/`toString` callback diagnostics. Against the new package it emits successfully; callback rejections still pass.

## OutMessages after connected Step combinations

The pending candidate already removed two outer `NoInfer` wrappers from the data-first tuple and homogeneous-array `combineSteps` returns. That repair also resolves the new report. The data-last wrappers remain in place. No further Update implementation change was needed.

The new [public declaration fixtures](../packages/foldkit/declaration-tests/combined-outmessage.accepted.ts) exercise tuples, homogeneous arrays, their curried forms, and nested tuple/array combinations. They retain every attached OutMessage tag and exact Model, Command/Service requirements, registration evidence, completed Layer requirements, and constructor error. Callback and exhaustive handler-record updates, Story expectations, and parent policy completeness are checked. The [rejected cases](../packages/foldkit/declaration-tests/combined-outmessage.rejected.ts) retain wrong-graph, missing-handler, invalid-argument, and discarded child-policy OutMessage errors. The original raw-local/connected mixture still requires the existing Definition-owned Step repair.

`Update.withOutMessage` can attach an OutMessage to a valid plain combined result. It cannot repair a combination that already discarded a registered child's emitting policy. [Focused runtime tests](../packages/foldkit/src/block/combinedOutMessage.test.ts) check sequential Model application, lifted Commands, attached OutMessages, Story execution, and parent policy ordering. They do not introduce Command execution sequencing.

An initial strict relocated-declaration check exposed an assertion problem: comparing entire unions with anonymous types duplicated by emission rejected structurally identical members. The final assertions check each constituent strictly, reject `any` and `never`, and require all four channels for each of the six forms. Six isolated wrong-channel/`any`/`never` mutations fail those assertions. Restoring both old data-first wrappers together also fails the revised checks and reproduces the original inferred-branch loss. The wrappers were not mutated individually.

## Verification

Source/declaration checks and paired editor sessions use the pinned official native TypeScript `7.1.0-beta` compiler and Node `24.22.1`. Artifact builds retain each package's pinned toolchain.

| Gate                          | Result                                                                                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Source configurations         | All 53 pass                                                                                                                        |
| Focused core runtime          | 132 tests in 7 files pass                                                                                                          |
| Full core declaration harness | External emission, rejection, strict relocation, native completion, and inferred configuration documentation pass                  |
| Full UI declaration harness   | Source/build, external emission, rejection, and relocation pass                                                                    |
| Regression mutations          | Old DateTime declaration check fails; both old combined-return wrappers restored together fail; six invalid-channel mutations fail |
| Lint and formatting           | Focused lint passes; changed files formatted                                                                                       |
| Independent review            | No blocking findings in this bounded delta                                                                                         |

The five existing compiler fixtures pass with exactly the preceding candidate's counts. Budgets and workload sizes are unchanged:

| Fixture                | Instantiations delta | Types delta |
| ---------------------- | -------------------: | ----------: |
| Deep eight             |              605,194 |      52,034 |
| Wide hundred           |            1,155,836 |      74,203 |
| Commands two hundred   |              332,643 |      62,402 |
| Workspace four groups  |            2,547,977 |     204,490 |
| Workspace eight groups |            4,331,509 |     279,239 |

### Paired native editor comparison

Three alternating pairs compare the preceding prepared candidate with this declaration followup. This is an incremental regression check, not another comparison with the published preview. Both snapshots use the same driver, compiler, request limits, lockfile, and consumer workloads. Driver validation checks completion contents, the expected introduced error, and clean restored diagnostics. No agent builds, tests, or other benchmarks ran concurrently; existing user editors/watchers remained available.

| Operation                                      | Before median ms | After median ms |
| ---------------------------------------------- | ---------------: | --------------: |
| Website post-edit Binding hover                |          272.025 |         268.552 |
| Website post-edit Binding completion           |          258.817 |         258.560 |
| Website post-edit definition                   |          271.947 |         258.490 |
| Website narrowed Route completion              |           16.321 |          15.695 |
| Website error appearance                       |          591.626 |         566.944 |
| Website error clearing                         |          593.625 |         595.323 |
| Website completed Message constructor, cold    |        2,904.821 |       2,925.826 |
| Workspace post-edit Binding hover              |          275.496 |         281.145 |
| Workspace post-edit Binding completion         |          271.007 |         270.904 |
| Workspace post-edit completed Block completion |           41.987 |          52.715 |
| Workspace error appearance                     |          210.162 |         219.533 |
| Workspace error clearing                       |          191.512 |         192.614 |

These measurements show no material regression from the declaration fix. They do not establish a speedup or equivalence. Maximum sampled Workspace server RSS is 460,640→474,896 KiB, an increase of 13.9 MiB (3.1%). Sampling can miss peaks, and short fresh sessions do not establish long-session stability. This driver measures official native server requests, excluding editor UI/plugins and tsrs.

The [previous comparison against the published preview](preview-framework-performance.md#final-post-change-benchmark) still applies: cold completed-root Message access retains its roughly 470 ms cost and Website error clearing its roughly 100 ms cost. The 32-group synthetic declaration serialization limit also remains. This type fix does not resolve those limitations.

Raw paired samples and all workload identities are in `/private/tmp/foldkit-preview-type-feedback-20261024/native-results.json` and `native-summary.json`. The common driver SHA-256 is `2f040354fa1d95582e1b8d8496acdb907dca5935fd8725aa9dc1d8e565347098`. Website workload hashes are `3351d3c56ae0a8b9910a825138ceb3b257c810ac93f2a24ac6d6f766aef8c122` before and `416ffcfd04cb59b1ca3b487dd077b50dd9ad44b52f6cad098c7ccfdcd2002420` after; Workspace hashes are `349cb96cf76785d2a00bedd9069a5f882dbbf61ce3496e8552ec0c498f7a7d98` and `c9f3b939be17647d863bc2674e80d5b56a67e4c83b65ead930be57aed010f5fe`.

### Fresh local artifacts

All nine packages were rebuilt and packed coherently as `-local.f89c6afa2fb1`. Isolated Coverchart and generated SPA, SSG, and SSR projects installed their existing Foldkit package sets at those exact local versions. All four source checks, including test source, pass. The two new declaration fixture groups also pass against installed public entrypoints, including physically relocated strict consumers with `skipLibCheck: false`.

Every one of the 449 packed production JavaScript files and 709 CLI source templates is byte-identical to the preceding fully tested candidate. Changed packed files are release metadata plus `viewInputs.d.ts` and its map. The preceding 40 Coverchart tests, 14 scaffold tests, and production browser suites are transferred evidence, not newly rerun results. The earlier runtime benchmark is also retained on that basis. The actual Coverchart repository remains unchanged at `c51e856b2e75ca44106e37ead24f9c4e8046aef0`, with all 88 tracked hashes preserved.

The [artifact refresh report](/private/tmp/foldkit-feedback-refresh-20261024/report.md) records package maps, hashes, installed provenance, runtime identity, validation-fixture supplementation, and the bounded SSG local peer transport. No registry acceptance or immutable documentation deployment is claimed.

## Release boundary and evidence

The active Block/update guidance, previous-preview upgrade guide, skill reference, and changeset describe these fixes. Historical published material is preserved. The bounded independent review found no blocking issue. This followup changes types and tests, introduces no dependency or production JavaScript change, and is not a new Daybreak review or clean dependency audit. The [existing security disposition](next-preview-security-review.md) remains explicit.

Detailed logs are under `/private/tmp/foldkit-preview-type-feedback-20261024/`: `consumer-source-checks.json`, `focused-runtime.log`, `core-emitted-final.log`, `ui-emitted.log`, `compiler.log`, `datetime-emitted-mutation.json`, and `native-summary.json`. Combined-result mutation evidence is under `/private/tmp/foldkit-combined-relocation-debug/` as `mutation-channels.log` and `old-wrapper-mutation.log`. The original failed whole-union assertion log is preserved alongside its successful final replacement.

Local verification is complete. No commit, push, merge, external PR edit, actual Coverchart migration, or publication was performed in this followup. Approval, the exact reviewed integration commit, registry/deployment checks, and the generated public release handoff remain separate gates in [the release handoff](next-preview-release-handoff.md).
