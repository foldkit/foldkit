# Issue 1737: `Composition.implement` evidence

Review material for the `Composition.implement` proposal in #1737. Drop this directory before merging.

- Base: `9a5f9307cb4af2aca8a1e28bbf7b21cf64e5f87c` (`codex/preview-followups`).
- Framework commit: `344295e57` (`feat(foldkit): add Composition.implement for Block assembly`).
- Consumer commit: `b6cbfc879` (`perf(website): assemble the root and Ui Blocks with implement`).
- Measured and gated tree: `19df81c00`. It differs from `b6cbfc879` only in the import order of `implemented-block.consume.ts` and `implemented-block.rejected.ts`, changed for `lint:ci`.

## Result

Post-edit root requests are 17 to 27% faster. They are still multi-second, so this is not a complete fix.

Final series against the exact commits, five interleaved runs per arm (`series-4-final.md`; raw material in `evidence.tar.xz`):

| Request | Baseline median (runs, ms) | Candidate median (runs, ms) | Change |
| --- | --- | --- | --- |
| Root completion, post-edit | 4665 (4665, 4665, 4707, 4722, 4567) | 3465 (3465, 3387, 3532, 3369, 3495) | -25.7% |
| Root completion, valid `ApplicationBlock.Model`, post-edit | 4671 (4653, 4671, 4823, 4639, 5471) | 3428 (3428, 3494, 3426, 3388, 3739) | -26.6% |
| Root `Model` hover, post-edit | 4621 (5254, 4561, 4547, 4993, 4621) | 3439 (3439, 3436, 3594, 3467, 3437) | -25.6% |
| Root error appearance | 4664 (4633, 4664, 4630, 4693, 4671) | 3755 (3878, 3750, 3754, 3816, 3755) | -19.5% |
| Root error clear | 4643 (4551, 4643, 4562, 4705, 4667) | 3838 (3923, 3838, 3819, 3744, 3925) | -17.3% |
| Composition completion, post-edit | 2543 (2509, 2543, 2558, 2718, 2476) | 2275 (2275, 2190, 2239, 2310, 2337) | -10.6% |

In this series every candidate sample is below every baseline sample for the root completion, hover, appearance and clear requests. Warm requests stay below 1 ms in both arms. The candidate's median sampled peak RSS is lower in every mode.

Two earlier series used the same framework content before final TSDoc, fixture and declaration-order changes (`pooled-series-1-2.md`, ten runs per arm): root completion 4670 to 3424 ms (-26.7%), root hover 4720 to 3519 ms (-25.5%), error appearance 4722 to 3828 ms (-18.9%), error clear 4657 to 3798 ms (-18.5%). One baseline diagnostics run in that pool hit the unchanged 22-second process limit while clear was pending; it is kept as a failed report, not retried or counted.

## Mechanism

An exported `const` without an annotation gets its type from its initializer. When another file needs that type after an edit, the new checker resolves the initializer again. For `X.assembleBlock({ ... })` this repeats the overload search over twelve signatures and each attempt's graph check (`ValidateImplementationComposition`: local and descendant handlers, Layer, host handlers, lifecycle registration and requirements), for every assembled Block in the closure.

The native checker has a fast path for this. `checkDeclarationInitializer` first calls `getQuickTypeOfExpression`. If the initializer is a call whose callee has exactly one non-generic call signature, it returns that signature's declared return type without checking arguments or `this` ([checkDeclarationInitializer](https://github.com/microsoft/typescript-go/blob/2bd066d87f5bafd315be9f40889d0a60b9e58e0b/internal/checker/checker.go#L16710), [getQuickTypeOfExpression](https://github.com/microsoft/typescript-go/blob/2bd066d87f5bafd315be9f40889d0a60b9e58e0b/internal/checker/checker.go#L7338), at the gitHead of the installed `typescript@7.0.2`).

`Composition.implement({ ... })` repeats the twelve `AssembleBlock` signatures with the same type parameters, constraints, parameter checks and contextual types. The only change: each `ValidateAssembleBlockComposition` becomes `ValidateAssembleBlockOperations` (operation names and exposed operations, kept in place), and the graph check moves into the returned `ImplementedBlock`. Its `assembleBlock()` has one non-generic signature whose `this` type applies the graph check through a function-type thunk, so the graph check is instantiated only when the calling file is checked. Importing files resolve the `implement` call with its other checks, then read `assembleBlock()`'s declared return type.

`scripts/generate-implement-block.py` derives the interface from the `AssembleBlock` source text, and `scripts/apply-framework.py` builds the framework change from the base files.

## What differs from earlier experiments

- The ledger's encodings changed overload order, return representations, carriers, single signatures or validation algorithms. In each, every importing file still resolved the producing call with all of its validation.
- The guarded producer boundary made `Model` independent through an explicit annotation, but other members were projected from the producer's inferred return, and the annotation was rejected as ceremony. #1737's Linux variant found no root gain.
- The unsafe declaration cut `ValidateImplementationComposition = unknown` (beta root 4158 to 2890 ms) showed the graph check is a large share. That cut removed the check everywhere.
- This boundary removes the graph check from importing files only. The producing file applies it unchanged. There is no annotation, cast, duplicated member list, widened bound or optional check, and inference is unchanged because the twelve signatures are kept.

## API and consumer code

```ts
export const UiBlock = UiComposition.implement({
  init,
  update,
  view,
}).assembleBlock()
```

`assembleBlock({ ... })` is unchanged and remains available. `implement` is opt-in per exported Block. The consumer commit changes only the root and Ui Blocks, which dominate the root closure (attribution below).

Tradeoffs:

- One extra call per exported Block.
- A graph-check failure is reported as TS2684 on the `implement({ ... })` receiver, with the diagnostic record in the elaboration, for example `Property ''Block handler requirements must be provided locally or listed in hostHandlers'' is missing`. Failures of the other checks keep their `implement` call errors. When `implement` rejects, error recovery can add a second TS2684 for the same expression.
- If only an earlier signature's graph check fails, `AssembleBlock` tries later signatures and `assembleBlock()` reports the failure. The 560-call corpus below has no valid call that depends on this.
- The `implement` signatures still resolve in importing files with their other checks, so importing files still pay for that overload search and for all inference of `init`, `update`, `view` and the Composition.

## Safety evidence

Real consumers:

- `equivalence/website-identity-proof.ts`: `Equal<typeof Old, typeof New>` holds for `UiBlock` and `ApplicationBlock`, a negative control holds, and inverting the assertion fails with TS2322.
- Declaration emit of the whole Website project is byte-identical between the base, the proposed commits, and an appendix variant with all 13 Website application Blocks migrated: 439 files, 36,360,368 bytes, the same 10 emit diagnostics (`equivalence/declaration-identity.json`). `ApplicationBlock` and `UiBlock` exceed the serializer limit (TS7056) in every arm, so the identity proof covers those two.
- The root `Model` hover text is identical in both arms.

Mechanical rewrite of every existing call site (`scripts/rewrite-assemble.py`), 560 calls in 186 files: declaration fixtures, framework sources and tests, `@foldkit/ui` including six generic factories, Website including snippets, and budget fixtures.

- `@foldkit/ui` declarations: 126 of 126 byte-identical. Fixture declarations: 47 of 47 byte-identical (`equivalence/declaration-identity.json`).
- Every `@ts-expect-error` disabled in all trees (`scripts/compare-diagnostics.py`, `equivalence/diagnostic-equivalence.json`). Base and candidate framework with original calls: identical errors. Original and rewritten calls: identical errors outside the rewritten calls, and every one of the 92 rejected calls (42 in tests, 50 in fixtures) is still rejected. No accepted call gains an error.
- `equivalence/rejection-classification.json`: 27 of the 92 rejections now come only from `assembleBlock()`, 20 only from `implement`, and 45 from both.

Committed fixtures, `declaration-tests/implemented-block.*`, run by `check:emitted-declarations` against source and relocated declarations:

- Identity with `assembleBlock` for view and Layer, inline Layer and nested producer with operations, headless, view without Layer, subscriptions, subscriptions with operations, managed resources with operations, headless host handlers with `provideHandlers`, an erased `Block.Implementation` (`never` in both forms), a generic view-input factory, a parent Composition and a Program.
- Valid `implement(...).assembleBlock()` calls through the relocated declarations, with identity.
- Rejections: missing handler Layer and a Layer without the handler (graph check); foreign view, extra field and an init that emits an OutMessage (`implement` checks); the unusable erased Block; a Program without its `Store` Service; a wrong parent field; a missing OutMessage policy.
- Mutations: removing the graph check from `assembleBlock()`'s `this` type makes the two graph cases unused directives; removing `ExactImplementationKeys` from the `implement` signatures makes the extra-field case unused (`gates/gate-mutation-seal.log`).

Runtime, `src/block/implementedBlock.test.ts`: `implement` and `assembleBlock()` build no Layer and run no init; the Block has the same keys, Schema, owner and init identities, and the same update results as `assembleBlock`; requirements and Program types are identical.

## Repository gates on the exact commits

`pnpm build:packages`; `check:emitted-declarations`; `check:block-type-performance` with `budgets.json` unchanged (deep 878,121 to 882,807 instantiations, wide unchanged, command 910,997 in the final run and 911,507 in the previous one, types unchanged); `pnpm -r --no-bail typecheck`, 53 projects; foldkit Vitest 3574 passed and 1 skipped; Website type-check. Earlier in the same branch: `@foldkit/ui` Vitest 1270 passed; Website Vitest 1445 passed with one build-script test over its 5-second timeout under host load, which passes alone in both arms (`gates/`). `oxfmt --check` and the root and application `oxlint` configurations pass on the changed files.

## Measurement protocol

- Host: MacBook Air, Apple M4 (4 performance and 6 efficiency cores), 16 GiB, macOS 27.0.1, battery power, Low Power Mode off. The host was not idle: other user applications ran, with load averages from about 3.5 to 8.
- Node v24.20.0, pnpm 11.8.0, frozen install and `pnpm build:packages` in two separate clones of the base.
- Native TypeScript 7.0.2, wrapper gitHead `2bd066d87f5bafd315be9f40889d0a60b9e58e0b`, executable SHA-256 `a82f731365ad69d5c4c15f5e18fba4584bf3b7b839960172a76c3462b5114bf2`, protocol client SHA-256 `bcbe8e0f8693a2e3effb4a890a70c331153b616a4a2f88406dcffd842364a2e6`. One identity in every run.
- Official probe SHA-256 `1491ea5fe44f546a4adfb74126a42ec866e7235a3c62f25dead66a6b75cc1751` and memory guard `f82396c66ef418574707f23e1056609be22b492308436d817d0102daefaa9eaf`, unchanged limits. Hover uses the `root-hover` fork from #1755 without changes (`scripts/root-hover-from-pr-1755.patch`, resulting probe SHA-256 `3ccab68a8d5cac56adf8c01adcea22764a7b3de57d4a58889bcb52594cf4f5ad`).
- `GOMEMLIMIT` and `GOGC` unset, other Go variables null. Serial runs, arm order alternating per repetition (`scripts/run-series.sh`, `scripts/analyze-series.py`).
- Workload: one document chain per mode and arm. Edit operations and request parameters are identical across arms. Source hashes differ only because `block.ts` uses the new call.
- `reports/` keeps every report except the two workspace inventories, which are replaced by entry count and digest; the probe compared them itself (`diskUnchanged`). `raw-report-sha256.txt` lists the SHA-256 of every full report.

Appendix, not proposed (`series-3-all.md`): with all 13 Website application Blocks migrated, root completion is 4765 to 3380 ms (-29.1%) and Composition completion 2508 to 2107 ms (-16.0%).

Checked-in route benchmark, `--runs 3`, one invocation per arm: medians move within about 10% in both directions, with no material change (`reports/route`).

## Remaining cost

Attribution screens with `scripts/decompose-probe.mjs` (one fresh server per symbol, completion on `symbol.` after a newline edit, same memory guard and limits; single runs, not the official benchmark):

| Symbol | Baseline post-edit ms |
| --- | --- |
| `ApplicationComposition` | 2537 to 2629 |
| root `update` | 3186 to 3280 |
| root `view` | 2978 to 3035 |
| `ApplicationBlock` | 4559 to 4950 |
| `UiBlock` (from the parent Composition) | 1534 |
| Ui `UiComposition` / `update` / `UiBlock` | 597 / 1068 / 1601 |
| Other child Blocks | 42 to 337 each |

The root assembly call adds about 1 s after its inputs, and Ui's about 0.5 s. After this change the root request is dominated by inference of the Composition and of `update` and `view`, which importing files still need.

## Rejected first design

The first candidate also moved `ValidateInit`, `ValidateView`, `ValidateViewForDefinition` and the operation checks into `assembleBlock()`. The rewrite experiment rejected it (`rejected-design/`):

- `AssembleBlock` uses validation failure to select signatures. Generic factories reach later signatures when `ValidateView` stays deferred, and Blocks with subscriptions and operations fall through the fourth signature because its operation check sits at the Layer position. Selection by shape alone rejected six `@foldkit/ui` generic factories with TS2684. For Slider and Toast it selected the fourth signature, whose Layer-position check then failed with TS2684, and the different completed type failed declaration emit with TS4023.
- Removing `NoInfer<ValidateInit<...>>` from the `init` property changed the contextual type of an inline `makeInit(...)` call, and its declaration printed `NoInfer<...>`.

Keeping every check except the graph check in place fixed all of these by construction.

## Reproduce

Two clones of the base with the issue's install and build steps, then apply the two code commits in one clone and run `pnpm build:packages`. With both harness files in a directory outside the clones:

```sh
CANDIDATE_WORKSPACE=/absolute/candidate scripts/run-series.sh series-name 5 root-incomplete root-diagnostics root-hover root-valid composition-incomplete
python3 scripts/analyze-series.py /absolute/reports/series-name --markdown
```

`run-series.sh` and `analyze-series.py` have local default paths at the top; adjust them for another host.
