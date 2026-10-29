# Definition-owned map Binding experiment

## Primary adopted-surface evidence

The primary results are `final-workspace.json` and `final-scale-root.json`.
They compare the pinned baseline with the final isolated `verified` source,
including the public `Block.MakeMapBinding` type export, removed standalone
package entry point and consumer/lint migration. `final-performance-inputs.patch`
preserves the relevant framework, Workspace, snippet, Vite alias and lint source
changes; it was checked against the baseline. `final-manifest.json` records those
input hashes. Later lint-provenance corrections do not change the measured Block
typing or Runtime implementation. The patch preserves the timed snapshot. The
larger workload/probe transformation is shared with the initial control below.

Three-run paired medians in milliseconds:

| Operation                       | Workspace baseline | Adopted surface | 16-group baseline | Adopted surface |
| ------------------------------- | -----------------: | --------------: | ----------------: | --------------: |
| Post-edit Binding hover         |            329.455 |         274.397 |           101.573 |          48.526 |
| Post-edit Binding completion    |            312.886 |         278.631 |           109.129 |          52.511 |
| Post-edit root Block completion |             59.030 |          52.512 |            18.671 |          28.518 |
| Title error appearance          |            200.896 |         205.932 |          1724.037 |        1743.769 |
| Title error clearing            |            184.619 |         179.786 |          1865.424 |        1735.553 |

Binding hover/completion improve in these workloads. The larger root remains
expensive to diagnose, and completed-Block completion is about 10 ms slower in
its three-run median. That completion's baseline samples span 17.901–35.778 ms;
the adopted samples span 25.083–30.487 ms. Do not present this as a universal
speedup or claim that whole-root diagnostics are solved.

Median sampled process peaks in MiB:

| Scenario              | Workspace baseline | Adopted surface | 16-group baseline | Adopted surface |
| --------------------- | -----------------: | --------------: | ----------------: | --------------: |
| Binding hover         |              429.0 |           426.1 |             225.7 |           196.8 |
| Binding completion    |              429.7 |           428.8 |             236.0 |           206.4 |
| Root Block completion |              363.6 |           356.8 |             182.4 |           184.9 |
| Diagnostics           |              413.3 |           398.9 |             479.1 |           496.9 |

Memory is mixed across workflows. Peaks are sampled whole-scenario RSS, not
allocation totals or individual-request memory. Individual samples, timestamps,
validation evidence and hashes are retained in the compact final JSON.

### Compiler-budget decision

The adopted surface **does not pass the original unchanged budgets**.
`workspace-composition-4` measured 2,642,699 instantiations and 229,173 Types,
against original ceilings of 2,639,574 and 206,314. The lead deliberately raised
only those two ceilings to the measured values, following the paired editor
measurements and safety verification. The rerun passes all six fixtures with that
targeted adjustment. Fixture source files and every other ceiling are unchanged.

See `compiler-budget-results.json` for all six counts and before/after ceilings,
`verified-counts.txt` for the original failure, and
`verified-reviewed-budgets.txt` for the adjusted gate. This remains a stated
tradeoff for release review; it is not an unchanged-budget pass. The 8-group
result is 4,265,971 instantiations and 276,909 Types, within its existing ceilings.
`reviewed-budget-adjustment.patch` records the two changed ceilings separately
from the performance-input patch. It is needed only to reproduce that explicitly
adjusted compiler gate; changing ceilings does not change measured editor work.

### Final declaration proof

Fresh final baseline and verified 16-group emission and strict relocated
consumption both pass. The root, groups and shared fixture declarations remain
byte-for-byte identical between the two sides, totaling 3,140,462 bytes each.
The consumer reaches all three fixtures and 454/456 declaration files, with
`skipLibCheck: false`, no path mappings and no non-consumer source TypeScript.
Inputs and package declarations remain unchanged during verification.

Exact source/fixture/declaration hashes are in
`final-scale-emission-manifest.json` and `final-scale-consumer-results.json`.
The single emission/consumption durations are validation provenance, not paired
performance measurements.

## Initial supporting control

This pack records the initial `Definition.makeMapBinding(ChildBlock, config)`
prototype compared with the standalone `makeMapBinding(Definition, ChildBlock,
config)` helper at commit `14e5d7330eca3bacdef2b6591cc204c8440061af`.

**These editor measurements precede the final adoption's public
`Block.MakeMapBinding` type export and complete migration.** They do not establish
the final adopted API's performance or compiler-budget status. Final measurements
and counts are recorded separately above, without replacing these initial files.

The environment was macOS arm64, Node `v24.22.1`, native official TypeScript
`7.1.0-beta`, and the pinned lockfile. This is a comparison against the then-current
optimized branch, not against the original slow preview or tsrs.

`initial-candidate.patch` preserves the exact initial framework and Workspace
authoring delta. The initial prototype does not include the final public export,
removed package entry point, full consumer migration or associated documentation.

## Workloads and validation

- `initial-workspace.json`: actual Workspace, with its issue-detail Binding hover,
  Binding completion, completed root Block completion, and issue-title error/clear
  diagnostics.
- `initial-scale-root.json`: a generated 16-group composition with 16 additional
  map Bindings. Hover/completion target the first map Binding. Completed Block
  completion and error/clear diagnostics target the full application root.
- `initial-scale-child.json`: preliminary investigation. Its diagnostics target
  the shared editor child. **Do not use those diagnostics to characterize the
  larger root.** The original calibration sample is excluded entirely because
  unrelated compiler work might have overlapped it.

Each formal workload has three paired runs in baseline/candidate,
candidate/baseline, baseline/candidate order. Each scenario starts a fresh native
server. The driver checks expected hover structure, required completion members,
an initially clean diagnostic report, the expected TS2322 title error at its
edited range, and successful clearing after restoration. Edits are incremental
in-memory document changes; disk source is not mutated by the measurement.

The compact JSON retains individual latencies, result counts/bytes/hashes,
diagnostic evidence, source/workload/lockfile/driver hashes, timestamps and peak
RSS. It deliberately omits the repeated raw RSS sample lists. RSS was sampled
with `ps` every 250 ms; short-lived allocation peaks may be missed, and peaks are
per scenario, not per request.

### Initial measurements only

Three-run medians in milliseconds:

| Operation                       | Workspace baseline | Workspace prototype | 16-group baseline | 16-group prototype |
| ------------------------------- | -----------------: | ------------------: | ----------------: | -----------------: |
| Post-edit Binding hover         |            332.676 |             283.804 |           100.529 |             45.785 |
| Post-edit Binding completion    |            323.627 |             265.137 |            96.351 |             46.998 |
| Post-edit root Block completion |             55.320 |              51.776 |            17.471 |             17.297 |
| Title error appearance          |            208.136 |             188.926 |          1624.196 |           1636.219 |
| Title error clearing            |            185.039 |             189.748 |          1582.406 |           1605.331 |

These initial measurements show why the prototype was worth carrying forward.
The full-root diagnostic work remains substantial and did not improve here.
Memory results are mixed and must not be summarized as a general memory win.
These are three local paired runs, not responsiveness guarantees for other apps
or measurements of the final public export.

`initial-candidate-counts.txt` records all six unchanged compiler budgets passing
for this earlier prototype. It is not the final exported surface's gate result.

## Strict declaration consumption

Both larger workloads emitted three fixture declaration files, totaling
3,140,462 bytes per side. The three files are byte-for-byte identical between the
baseline and initial prototype. Emission diagnostics are preserved in
`initial-*-scale-emission.txt`.

`verify-scale-consumer.py` copied the emitted fixtures and the respective built
Foldkit declaration tree to a separate relocation directory, then compiled
`scale-consumer.ts` with `strict: true`, `skipLibCheck: false`, and no source path
mappings. The consumer exercises the completed root, first/last group identities,
map child Model, required Services, constructor errors, operations and rejected
payload/initialization arguments.

Both runs passed. All three fixture declarations were reached, with 454/456
reachable declaration files respectively and no non-consumer source TypeScript
files. Input fixture and package declaration hashes remained unchanged. The
single validation-run durations are recorded for provenance, not treated as a
benchmark. See `scale-consumer-results.json` for exact hashes and scope.

## Reproduction

Start with two disposable checkouts of the pinned commit. Set `artifacts`,
`baseline_checkout` and `candidate_checkout` to their portable local paths.
For the primary final experiment, apply the final performance-input patch to the
candidate only:

```sh
git -C "$candidate_checkout" apply --unidiff-zero "$artifacts/final-performance-inputs.patch"
```

The patches use zero context to keep blank context lines free of trailing
whitespace. Apply them with `git apply --unidiff-zero`.

To reproduce the initial control instead, use `initial-candidate.patch` in place
of that patch. Do not apply both. After applying the chosen patch, install the
pinned dependencies and build public packages in each checkout:

```sh
pnpm install --frozen-lockfile
pnpm build:packages
```

Then prepare the generated workload and driver:

```sh
python3 "$artifacts/prepare-scale.py" "$baseline_checkout" baseline
python3 "$artifacts/prepare-scale.py" "$candidate_checkout" candidate
```

Here `candidate` selects the Definition-method authoring dialect, including when
that checkout is named `verified`. The exact generated workload/probe files are
shared by the initial and final comparisons.

`prepare-scale.py` runs the existing pinned generator, adds exactly 16 map
Bindings and their Models/initialization/policies, and adds a title Message to the
root for whole-root diagnostic checks. It copies the existing native driver and
applies `scale-probe.patch`. It also corrects the existing Workspace driver's
initializer filename. Generated workload, config and driver hashes must match
`initial-manifest.json`; the transformation was independently rerun in fresh
scratch directories for both sides and matched those hashes exactly. Do not
reformat the generated files afterward when reproducing the recorded hashes.

Use each checkout's own built package declarations. Run the commands below once
per side in baseline/candidate, candidate/baseline, baseline/candidate order,
writing a separate report for every invocation. Do not run typechecks, builds or
other profilers concurrently with timed measurements.

```sh
node packages/foldkit/scripts/profile-block-language-service.ts --scenario workspace --runs 1
node packages/foldkit/scripts/profile-map-binding-scale.ts --scenario workspace --runs 1
```

For declaration reproduction, emit the scale root with each checkout's compiler
to `evidence/final-baseline-scale-declarations` or
`evidence/final-verified-scale-declarations`, respectively:

```sh
pnpm exec tsc -p packages/foldkit/type-performance/tsconfig.json --declaration --emitDeclarationOnly --noEmitOnError --outDir "$declaration_output" --extendedDiagnostics
```

Keep the resulting `workspace-composition-16.d.ts`, `workspace-groups-16.d.ts` and
`workspace-shared.d.ts` together. For the primary final proof, arrange the two checkouts as `baseline/` and
`verified/` beneath one experiment directory, then run:

```sh
python3 "$artifacts/verify-scale-consumer.py" "$experiment_directory" --sides baseline verified --prefix final-
```

The verifier takes its external dependencies from those installed checkouts. It
copies only Foldkit `.d.ts` files into each relocation and verifies the compiler's
actual file list. No source map or path mapping redirects it to library/app
implementation files.

## Files and limits

`initial-manifest.json` pins the initial input files, compiler driver,
workloads, generator and lockfile. `final-manifest.json` and the final emission
manifest pin the adopted-surface inputs. It includes the source commit and recorded
workload hashes; a source commit alone is insufficient because both sides have
explicit experiment edits. `artifact-manifest.json` hashes this portable pack.

This pack contains neither the multi-megabyte emitted fixture files nor full RSS
logs. The generator, exact source/probe patches, emitted-file hashes and strict
consumer provide the reproduction path. The parent release review owns the
complete adoption report, wider source/emitted acceptance and rejection tests,
runtime verification, the explicit budget tradeoff and release approval.
