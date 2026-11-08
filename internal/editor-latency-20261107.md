# Current editor-latency investigation

Date: 2026-11-07

The [November 8 input controls](editor-latency-20261108/README.md) separate root
builders from child implementation Layers. The multi-second cost is already
present in child Layer inference. The named completion projection proposed at
the end of this dated report was tested and rejected; it is not a new candidate.

## Outcome

The retained language-service harness had drifted from the current Layer-based
API and could not support a new attribution. It is now retargeted to real
Website and Workspace consumer expressions. The helper passes the pinned local
TypeScript 7.1 beta source check, and its ten Node tests pass. After all build
and compiler gates stopped, one smoke and five measured fresh-server samples of
each emitted-package scenario passed every semantic result guard.

A later request-scoped native profile isolates the current Layer delay. Project
loading is not the multi-second portion, and the root `makeLayer` call and
provider composition are not independently multi-second boundaries. Most of
the delay is already present when the real root inputs and child Layer exports
are collected in plain records. Native samples show allocation/page activation plus broad
conditional-type instantiation and relationship checking. They do not identify
an application type alias or revive the retired `IsPlainProducer` attribution.

This repair does not change framework types, application annotations,
framework validators, compiler ceilings, or historical benchmark results.

## Repaired probes

| Probe                                | Current consumer                                                                                       | Required result                                                                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Website Binding hover                | `SearchBinding` in `packages/website/src/composition/composition.ts`                                   | A current descriptor Binding type, `Search` ownership when visible, and either the expanded current Search Model or the named `SearchBlock`/`Model` boundary |
| Website definition                   | `ApplicationBlock.makeLayer` in `packages/website/src/layer.ts`                                        | A non-empty definition result for the current completion boundary                                                                                            |
| Website route completion             | `previousRoute.` in `packages/website/src/update/handleChangedUrl.ts`                                  | The exact expected Route members                                                                                                                             |
| Website Binding completion           | `SearchBinding.` at the real `informOfRouteChange()` call                                              | `informOfRouteChange` and `embedView`                                                                                                                        |
| Website error appearance and clear   | The real Route writer in `handleChangedUrl.ts`                                                         | Initially clean, exact TS2322 at the expected writer after the semantic edit, and clean again after restoration                                              |
| Passive Block Message access         | Minimal entry document comparing local `Message.ChangedUrl` with `ApplicationBlock.Message.ChangedUrl` | Clean full diagnostics from a fresh server for each access                                                                                                   |
| Layer diagnostic                     | Real `packages/website/src/layer.ts` record completion                                                 | Clean full diagnostics from a fresh server                                                                                                                   |
| Workspace Binding hover              | `IssueDetailsBinding` in `examples/workspace/src/composition.ts`                                       | A current descriptor Binding type, `IssueDetail` ownership when visible, and the current IssueDetail Model or named boundary                                 |
| Workspace Binding completion         | The real imported `IssueDetailsBinding.embedView` call in `examples/workspace/src/view/workspace.ts`   | `requestSave`, `embedView`, and `init`                                                                                                                       |
| Workspace passive Block completion   | `ApplicationBlock.Message.ClickedLink` in `examples/workspace/src/entry.ts`                            | `Model`, `Message`, `makeComposition`, and `makeLayer`                                                                                                       |
| Workspace error appearance and clear | The real title writer in `examples/workspace/src/blocks/issueDetail/update.ts`                         | Initially clean, exact TS2322 at the expected property after the semantic edit, and clean again after restoration                                            |

The hover validator still rejects direct `any`, `unknown`, and `never`. Tests
also retain explicit wrong-owner, wrong-Schema, wrong-result, missing-completion,
wrong-range, and lingering-diagnostic controls. A non-empty hover is not enough.

The client now records opened document URIs, sends `textDocument/didClose` for
each one, requests `shutdown`, sends `exit`, and closes stdin. It escalates only
its own server process to `SIGTERM` and then `SIGKILL` if graceful shutdown does
not finish. This makes cleanup server-owned and bounded even after a failed
request.

## Why the old attribution does not transfer

The old report measured the retired assembly API. Its slow cold Website root
request was attributed to TypeScript alias instantiation around
`fromAssembly.ts` and `IsPlainProducer`. The current reachable paths are
different:

- `Block.make` produces `UnifiedBlock` / `UnifiedBlockFields`. The passive
  `ApplicationBlock` contract is independent of its implementation graph.
- `ApplicationBlock.makeLayer(record)` enters `MakeLayer`, then
  `AcquiredConstructorBody<Record>`. The init plan selects registered
  Bindings, and validation reaches `Validate`, `ActualFacts`,
  `HostContractValidation`, and the published Mount and InMessage checks.
- Binding construction reaches `RelationshipConstructors`, the appropriate
  Binding constructor, and `DescriptorBinding` / `DescriptorBindingMember`.
- `fromAssembly.ts` remains exported for compatibility and is used by legacy
  runtime paths, but it is not on the current emitted declaration path above.

Therefore the old `instantiateTypeWithAlias` / `IsPlainProducer` finding is
historical evidence, not a current optimization target. A new request-scoped
profile is required before changing framework types.

The current compiler-count receipt in
`internal/block-record-completion-20261107` is also not editor latency. It shows
that record completion is slightly cheaper than the adapted manual completion
in the canonical comparison while the existing eight-fixture gate keeps its
unchanged ceilings.

## Package declarations versus source aliases

The default app workload is an emitted-package workload. Both apps import the
workspace-linked `foldkit` package, whose package exports point TypeScript to
`packages/foldkit/dist/**/*.d.ts`. The app documents themselves remain source
files. This is representative of an external package consumer and should be
the primary result.

A source-alias workload is a separate repository-development control. It must
map `foldkit` and every used subpath directly to
`packages/foldkit/src/**/public.ts`, use the same app files and pinned compiler,
and record the alias configuration in the workload hash. The current LSP
harness has no source-alias switch, so a current run must not be labeled
source-mode. Add an isolated harness-owned source configuration before timing
that control. Do not edit the application tsconfigs or mix source and emitted
resolution within one sample.

## Current emitted-package results

These are medians and full ranges in milliseconds across five fresh-server
samples. They use application source plus the workspace package's emitted
`dist` declarations. Source-alias mode was not run.

### Passive Block and Layer boundaries

| Request                                                  |        Median (range), ms |
| -------------------------------------------------------- | ------------------------: |
| Local Message access, cold diagnostics                   |    412.1 (382.9 to 418.9) |
| Passive Block Message access, cold diagnostics           |    391.7 (389.3 to 430.3) |
| Real `ApplicationBlock.makeLayer` file, cold diagnostics | 4639.4 (4622.4 to 4719.9) |

The full Website series independently repeated the same boundary probes. Its
Layer median was 4752.4 ms (4692.7 to 5577.5), while local and passive Block
Message medians were 420.4 and 412.7 ms. The passive Block itself is not the
multi-second boundary. The current real Layer record is.

### Website

| Request                                         |       Median (range), ms |
| ----------------------------------------------- | -----------------------: |
| Block hover, first                              |   434.4 (410.0 to 484.2) |
| Binding hover after whitespace edit             |   254.2 (232.4 to 338.8) |
| Binding hover after semantic edit               |   242.5 (208.6 to 301.2) |
| `makeLayer` definition, first                   | 1034.0 (988.0 to 1158.9) |
| `makeLayer` definition after whitespace edit    |   833.1 (799.9 to 865.7) |
| Route completion, first                         |   246.2 (231.1 to 286.3) |
| Route completion after whitespace edit          |      15.9 (14.1 to 19.4) |
| Binding completion, first                       |   443.3 (430.8 to 463.9) |
| Binding completion after whitespace edit        |   237.3 (224.0 to 266.8) |
| Changed-URL Binding hover after whitespace edit |   254.8 (227.6 to 270.4) |
| Clean diagnostics                               |   331.3 (303.9 to 350.8) |
| Route error appearance                          |   353.2 (329.0 to 396.1) |
| Route error clear                               |   333.7 (318.3 to 386.3) |

### Workspace

| Request                                        |     Median (range), ms |
| ---------------------------------------------- | ---------------------: |
| Binding hover, first                           | 298.2 (275.2 to 301.2) |
| Binding hover after whitespace edit            | 173.4 (153.4 to 194.4) |
| Binding completion, first                      | 279.5 (264.9 to 291.0) |
| Binding completion after whitespace edit       | 164.2 (145.0 to 174.5) |
| Passive Block completion, first                | 215.6 (211.7 to 218.7) |
| Passive Block completion after whitespace edit |   81.2 (80.6 to 102.5) |
| Clean diagnostics                              | 324.8 (311.0 to 338.4) |
| Title error appearance                         | 205.5 (194.9 to 223.1) |
| Title error clear                              | 194.5 (182.6 to 215.7) |

All returned result and source hashes were stable for each request label across
the five runs. Completion counts were stable, definitions always returned two
locations, clean/restored diagnostics were empty, and each injected error
returned exactly one diagnostic at its expected writer.

Workspace peak sampled server RSS was:

| Scenario                 |    Median (range), MiB |
| ------------------------ | ---------------------: |
| Binding hover            | 464.4 (438.7 to 481.2) |
| Binding completion       | 468.4 (439.9 to 474.7) |
| Passive Block completion | 433.3 (427.7 to 438.3) |
| Diagnostics              | 474.0 (448.7 to 495.0) |

The bounded run stayed below 500 MiB sampled RSS. Sampling can miss peaks and
does not establish long-session stability.

### Frozen identities

- Commit: `54f8bcd443b4fd18952403a3d02e212abf872d58` with the recorded dirty
  workload.
- Website workload: `9349e65b5b88f6b3f3aaf9e97828b456d8f2ca0548ac95bf6530f9c0a30a732c`.
- Workspace workload: `1d1eb1191f67465f90d6c1c2635a9f0ebf9e1e9c24f962535028787671660f2d`.
- Harness: `14f5cba79e287995a032217ea63b601b3653d4105cf76031efe951637328d2d8`.
- Lockfile: `3659249b317572543f8f9e01f4997a099f4fa32ee6285825694fe4b83ebd582f`.
- Exact Node executable:
  `/Users/devinjameson/.vite-plus/js_runtime/node/26.13.0/bin/node`, version
  `v26.13.0`, SHA-256
  `533bd644c5ae0e0ea3a80e433aad16b817447ccba1e1eea701875eac80cb75d4`.
- Native TypeScript compiler: `@typescript/typescript-darwin-arm64`
  `7.1.0-beta`, SHA-256
  `29f5eb8daa5c8cf6ef1c0cb79fbcf47c0cfdf26edabdf148bb779d0b2d56cebc`.

The harness rechecked its workload hash after each complete series, before the
quiet window was released. Later post-measurement cleanup changed two unrelated
core source expressions and moved renderer receipts. Those changes did not
touch the harness, Website, Workspace, or `dist`, but they mean a later global
working-tree snapshot is not byte-identical to the measured workload.

Raw emitted outputs were retained for the handoff at:

- `/tmp/foldkit-editor-latency-20261107.pbMqdN/measured-boundaries-emitted.json`,
  SHA-256 `e6946806800756425f1f61129e4d0e18fa4cc9be39c355dfd300ef6df511d343`.
- `/tmp/foldkit-editor-latency-20261107.pbMqdN/measured-website-emitted.json`,
  SHA-256 `564abdb7351418a200049a269ef34c4175b65902977167cbc3a6b0c9041f6a50`.
- `/tmp/foldkit-editor-latency-20261107.pbMqdN/measured-workspace-emitted.json`,
  SHA-256 `e71caba85ef7882e4c56a87502ce1a9863ed1efec0bffccee27733729a40256b`.

Hash-verified copies of those three files are retained under
[`editor-latency-20261107/measurements`](editor-latency-20261107/measurements).

Two failed Workspace smokes are excluded from these results. They exposed stale
validator assumptions: current owners render through the explicit
`Owner<NominalId<...>>` wrapper, and TypeScript truncates the IssueDetail hover
before the draft field. The repaired guard now requires the exact nominal owner
and visible current revision Schema fields, with wrong-owner and missing-field
negative tests. Neither failure was a framework failure or a valid timing
sample.

## Request-scoped native profile

The pinned TypeScript 7.1 beta server exposes `custom/startCPUProfile` and
`custom/stopCPUProfile`. The profile mode starts a fresh server for each
control, starts native profiling immediately around the selected request
window, requires exact clean diagnostics, stops profiling, validates the
returned gzipped protobuf path and hash, then performs the same bounded
server-owned cleanup as the timing harness.

The controls all use the real `packages/website/src/layer.ts` URI and configured
project:

1. `minimal` imports and exposes only the passive `ApplicationBlock`.
2. `imports` keeps every real import, exposes the root inputs in a plain record,
   and exposes every child `.layer` in a second plain record.
3. `unprovided` keeps the same child Layer record and replaces the root-input
   record with `ApplicationBlock.makeLayer(...)`.
4. `full` uses the unmodified real source, including `Layer.provide` and
   `Layer.mergeAll`.
5. `post-open` uses the same full source but opens it before the profiling
   barrier.

Every control records the source text actually dispatched to the server. The
batch gate requires the first four source hashes to be distinct, requires each
hash to equal the independently generated expected source, and requires
`full`/`post-open` to match. All five returned exact clean diagnostics:

| Control      | Diagnostic, ms | Profile window, ms | Sampled CPU, ms | Project presence, ms | Checker presence, ms | `instantiateTypeWithAlias`, ms |
| ------------ | -------------: | -----------------: | --------------: | -------------------: | -------------------: | -----------------------------: |
| `minimal`    |          553.3 |              723.0 |          1820.0 |                650.0 |                 60.0 |               below top-40 cut |
| `imports`    |         4945.2 |             5052.1 |          6640.0 |                630.0 |               1410.0 |                          900.0 |
| `unprovided` |         5390.8 |             5569.4 |          7490.0 |                700.0 |               1680.0 |                         1290.0 |
| `full`       |         5142.6 |             5249.6 |          6980.0 |                640.0 |               1360.0 |                         1020.0 |
| `post-open`  |         4944.4 |             5050.4 |          5750.0 |                  0.0 |               1610.0 |                         1270.0 |

CPU totals can exceed wall time because the native compiler samples concurrent
Go work. “Presence” is an overlapping cumulative-stack total, so those columns
must not be added. These profiled timings include profiler overhead and are for
attribution, not replacements for the five-run unprofiled latency results.

The control split supports four conclusions:

- Parser/project loading is bounded at about 630–700 ms of cumulative sampled
  CPU in every pre-open control. The `post-open` profile contains no project or
  parser sample but its diagnostic still takes 4.94 seconds. Queued `didOpen`
  work is therefore not the multi-second request.
- Moving from the passive Block-only document to the real imported graph adds
  about 4.39 seconds of wall time. That control includes both root inputs
  (`EffectsLayer`, init, update, view and Subscriptions) and child Layer exports.
  It does not isolate those two sources of type expansion from each other.
- Adding the root `makeLayer` call to that same graph adds 446 ms in this single
  profiled sample. The unmodified provider-composed source is not slower than
  the unprovided control. This does not support targeting `Layer.provide` or
  `Layer.mergeAll`.
- In every slow control, the hottest compiler work includes
  `instantiateTypeWithAlias`, `instantiateTypeWorker`, conditional-type
  instantiation, and structured relationship checks. Flat native CPU is
  dominated by runtime heap/page work: `runtime.madvise` alone accounts for
  3.0–3.9 sampled CPU seconds in the four slow profiles, under
  `mheap.allocSpan`/`sysUsed`. This is evidence of allocation pressure while
  expanding the shared type graph, not attribution to a named Foldkit alias.

The valid batch is rooted at
`/tmp/foldkit-layer-profile-20261107.OXTyfI`:

- Capture JSON SHA-256:
  `9a175524caf72e3f8bacd1e92e298022a93349384b218a136ed0fdea1f7b87cc`.
- Decoded summary SHA-256:
  `415245058cdf26e3de260c5e8d6381832c820669b072c373e3fc6466fc9364cd`.
- Profile hashes, in control order: `61f2765d6e301719aae4ba71eb85e92ade59c87090addd82082beba51fde4ea5`,
  `993cc47388f86250b5d138d7df649d6989e2e6f5a55423bccde48536db503ec7`,
  `6f2e47d1db3afa0ee0e216cc94daf058146f56dcf855f80e2a0f682104a371cc`,
  `f54544d3d6e43f89d62d06ba13f7e71c8f20a23d9552d00660da024a4ccd5891`,
  and `19da09797242ecac9b0703829f450ccd9b1b8af121abf93b68e50287dfcf6137`.
- Commit: `dc2bf3175f280a32a654fdf0a4128595251bc820`; source workload:
  `12195981ff78c79117e43cb64b43858dbbafaf4aaf80b0c1c42b71db6c9b4818`;
  profile harness:
  `e1bdc2e28460cd38253fa20ef3a2df3d1d98fbd558af76b2e8720700bac968a2`.
- The original measured harness remains frozen at
  `14f5cba79e287995a032217ea63b601b3653d4105cf76031efe951637328d2d8`.
  The exact Node, compiler, and lockfile hashes match the emitted-package
  identities above.

The capture, decoded summary, all five compressed profiles, exact tool snapshots
and retained-file hashes are preserved under
[`editor-latency-20261107/measurements/profile-controls`](editor-latency-20261107/measurements/profile-controls).
The paths above record where the capture ran. The tool snapshots preserve the
measured bytes; the current script paths are the runnable entry points.

Two earlier profile attempts are invalid and excluded. The first exposed a
JSON-RPC transport bug that serialized a parameterless stop request with an
explicit null parameter; the transport now distinguishes absent parameters
from explicit `null`, with a focused serialization test. The second
(`R3Hfjr`) generated the intended controls but reopened the original source for
all five requests. Equal source hashes exposed the error; the explicit source
handoff and batch hash gate now make it an immediate failure. Both were harness
plumbing failures, not framework results, and every owned server stopped.

## Runnable measurement plan

Wait until all Website builds and core compiler gates stop. Freeze the commit,
working-tree status, `dist` output, lockfile, harness, Node version, and pinned
TypeScript identity. Then run the emitted-package baseline from the repository
root with the Node compile cache disabled:

```sh
NODE_DISABLE_COMPILE_CACHE=1 /Users/devinjameson/.vite-plus/js_runtime/node/26.13.0/bin/node packages/foldkit/scripts/profile-block-language-service.ts --scenario message-constructors --runs 5 --timeout-ms 60000 > /tmp/foldkit-editor-boundaries-emitted.json
NODE_DISABLE_COMPILE_CACHE=1 /Users/devinjameson/.vite-plus/js_runtime/node/26.13.0/bin/node packages/foldkit/scripts/profile-block-language-service.ts --runs 5 --timeout-ms 60000 > /tmp/foldkit-editor-website-emitted.json
NODE_DISABLE_COMPILE_CACHE=1 /Users/devinjameson/.vite-plus/js_runtime/node/26.13.0/bin/node packages/foldkit/scripts/profile-block-language-service.ts --scenario workspace --runs 5 --timeout-ms 60000 > /tmp/foldkit-editor-workspace-emitted.json
```

The Workspace command samples server RSS with
`ps -o rss= -p <server-pid>`. `ps` is denied in the current restricted
environment, so that command needs one authorized execution. Do not omit RSS
silently or substitute client-process memory. The Website and boundary commands
do not invoke the Workspace RSS sampler.

For an emitted/source comparison, first add a harness-owned
`--resolution emitted|source` mode that creates an isolated source-alias project
without modifying either app. It must include the alias config and mode in the
output and workload hash, and it must fail if resolved Foldkit files do not
match the requested mode. Then run five fresh-server pairs in a balanced order,
alternating which mode is first. Do not compare an emitted run from one build
or dirty state with a source run from another.

Each result is acceptable only when:

1. The compiler reports TypeScript `7.1.0-beta` from the pinned
   `packages/foldkit/node_modules/typescript` installation.
2. The workload, script, lockfile, source, and declaration hashes remain stable
   across every sample.
3. Semantic hover owner and Schema checks pass, completion labels are exact,
   definitions are non-empty, and diagnostic clean/error/clear transitions are
   exact.
4. Source text and declaration hashes after the run match the initial hashes.
5. Every fresh server exits through the bounded cleanup path.
6. Request latency uses the harness's `performance.now()` interval around only
   the LSP request. RSS sampling and cleanup stay outside that interval.

Summarize medians, ranges, result hashes, and peak sampled RSS. Keep every valid
outlier. Five fresh samples are still a screening result, not a long-session
stability claim. If memory remains a concern, follow with a separate bounded
20-edit single-server session with the existing RSS sampler and a documented
safety cap. Do not force garbage collection or include cleanup in request
latency.

For a future profile, use `--scenario layer-profile --runs 1 --profile-dir
<fresh-directory>`. Do not use whole-process `--pprofDir` as a substitute: it
includes startup and cleanup and cannot isolate the LSP request. Decode the
five returned `*.pb.gz` profiles with
`packages/foldkit/scripts/summarize-go-pprof.ts`. The mode rejects reused
profile directories, non-clean diagnostics, unexpected profile paths, source
hash drift, compiler identity drift, and a harness or workload change.

## Smallest plausible source optimization

The profile does not justify a `Layer.provide` optimization, an application
annotation, or a change to `IsPlainProducer`. One candidate for a narrowly
scoped internal A/B experiment is to project the current completion body and
facts once for each `MakeLayer` instantiation, then reuse that projection
throughout the existing call signature and result. The experiment would use an
internal helper around `AcquiredConstructorBody<Record>` and
`ActualFacts<MessageSchema, ..., Config>`; it must not change the public call,
remove distributive alternatives, or weaken any `Validate`,
`PublishedMountValidation`, `InMessageUpdateBodyValidation`, or
`HostContractValidation` tuple.

That projection is a hypothesis, not an alias-specific profile finding. The
`imports` control includes root plans as well as child Layer call sites; a
future control could separate them before choosing an implementation target.
A shared internal projection could apply to several completion sites without
consumer changes.
The A/B acceptance test should use the same hash-guarded controls without native
profiling, five fresh servers per side in balanced order, and the existing
compiler-count/declaration/correctness gates. Reject it if it merely moves work,
changes exact declarations, or fails to improve the `imports` and full-source
controls beyond run noise.

A previous direct-prototype naming control did not materially recover compiler
instantiation counts, so the new experiment must be measured rather than
assumed. Changing `IsPlainProducer`, weakening validators, relaxing ceilings,
or starting another public API migration is not supported by the current
trace.

## Retained historical evidence

The October 27 assembly-era candidate recorded these medians: Workspace
post-edit Binding hover 265.1 ms, Workspace post-edit Binding completion
254.3 ms, Workspace post-edit completed-Block completion 51.3 ms, title error
appearance 187.6 ms, title error clear 176.2 ms, and Website completed-Block
cold diagnostics 2996.0 ms. Those runs had exact result validation and remain
useful history, but they do not measure the current passive Block and Layer API.
