# Composition feedback closeout

## Status

The four items reopened by the user's October 24 scope correction are implemented locally. They were not approved deferrals. This report records their APIs, checks, and remaining boundaries; it does not mark the next preview Ready or authorize publication.

The checkout is based on `31d8aad9fe4555112b3cf8e2d948badeee9ced0d` and includes concurrent uncommitted work. The published Ready preview remains `1f6776fa7ececa766188df5201eefec6ba781b5d`.

This report preserves the October 24 closeout checkpoint. Subsequent record-only update and focused-producer changes require refreshed inclusive verification. The aggregate ManagedResource spelling below is updated to the settled API; older assessment documents retain their labelled experimental encodings. See the [current adoption audit](preview-api-adoption.md) and [release gates](next-preview-tasks.md#current-integration-gates).

## Consumer surface

### Record and HashMap child storage

```ts
import { makeMapBinding } from 'foldkit/mapBinding'

const EntryBinding = makeMapBinding(ApplicationDefinition, EntryBlock, {
  field: 'entriesById',
})

const WrappedEntryBinding = makeMapBinding(ApplicationDefinition, EntryBlock, {
  field: 'rowsById',
  childField: 'entry',
})
```

The parent Schema supplies the storage, primitive key Schema, and exact child Model contract. Parents own insertion, removal, wrapper metadata, and display order. Ordinary folds and operations replace only existing matching entries. Dynamic `Binding.init({ key, args, toParentModel })` retains its existing insertion and Command contract. Membership controls occurrence presence; Subscription gates control only Streams.

Default placement is the parent field name. Explicit placements distinguish two Bindings targeting different child fields in the same wrapper map. Multiple maps containing the same child Block are covered in one real Composition. Keys use the existing occurrence identity and lifecycle machinery.

The dedicated subpath is intentional. Tested ordinary Definition/Block namespace encodings exceeded the existing Workspace Types ceilings; the separate helper passes all five unchanged budgets without loading its heavier generic surface into ordinary authoring. This is evidence about those encodings, not proof that TypeScript requires a particular spelling.

Composite object keys do not satisfy primitive occurrence identity. Use a primitive identity with a general keyed adapter for those domain maps. Actual numeric keys must be finite. Compatible union selectors retain conservative possible contracts; narrow the selector when exact graph placement is required. [Assessment and source/emitted/runtime proofs](record-hashmap-binding-assessment.md).

### Aggregate ManagedResource Layers

```ts
export const EffectsLayer = Layer.mergeAll(
  LoadWorkspace.layer,
  managedResources.layer,
)
```

`Definition.makeManagedResources` exposes `.layer` when every entry has an
attached handler, preserving exact Layer success, error, and Service channels.
Empty registries expose `Layer.empty`. The entry key `layer` is now reserved;
source/emitted checks and erased-caller validation reject it. Aggregate metadata
is non-enumerable and never becomes a resource entry. Own non-enumerable source
entries remain included.

Mixed and host-owned registries require explicit providers. Open records, symbol
keys, widened Layers, and conflicting handler unions remain rejected;
same-contract discriminated entry unions remain accepted. Construction stays
passive, and native resource identity and lifecycle checks remain in place.
The prototype aggregate function was replaced without an alias. No owner-wide
Command registry is added; explicit Command `.layer` composition remains the
documented contract. [Earlier aggregation assessment and safety controls](aggregate-handler-layer-assessment.md).

### Pending Command argument inspection

```ts
const maybeArgs = Story.Command.argsOf(SaveIssue)(pending)
const maybeSceneArgs = Scene.Command.argsOf(SaveIssue)(pending)
```

These project the original captured arguments by Definition identity. Same-named foreign Definitions do not match. An argless match yields `Some(undefined)`. Projection neither executes a Command nor chooses one keyed/sibling occurrence; tests retain explicit occurrence and cardinality selection. [Contract, realistic split-file helper, and compiler encoding](pending-command-inspection.md).

### Compiler diagnostics

Connected-Step errors name the registered Composition and deferred `Definition.makeStep` repair. Invalid data-first Step combinations identify the incompatible OutMessage channel. Malformed assembly objects distinguish primary-view ownership from missing handler providers. Invalid init results retain missing-Model or incompatible-OutMessage errors.

A terminal diagnostic overload leaves successful overload order and inference unchanged. Invalid concrete calls fail where authored, including discarded results. Source and relocated-declaration checks assert actionable fragments and verify that valid declarations never select the diagnostic fallback. Deliberate `any`/`never` erasure into older successful implementation overloads remains a documented TypeScript boundary; checked assembly producer guards remain verified. [Diagnostic proofs and limits](composition-compiler-diagnostics.md).

## Related correctness fix: reciprocal policy graphs

The public #1772 reproducer exposed repeated expansion of converging/reciprocal OutMessage policies. Graph closure now collects each reached placement's direct channels once, preserving parent-owned Command qualification and rejection of unhandled combined OutMessages. Fresh Astra Max review and source/emitted/runtime checks cover missing registrations, self/reciprocal cycles, and parent/child display-name collisions.

The original twelve-Binding reproducer failed at 10,309,506 Instantiations. The retained isolated proof checks at 391,295. This is a compiler result, not a measured editor speedup. [Reproducer, ownership proof, and exact scope](reciprocal-policy-closure.md).

## October 24 verification checkpoint

The checkpoint checks are recorded in `/private/tmp/foldkit-composition-closeout-20261024`. The full source sweep passes all 53 projects. Core and UI source, accepted/rejected declarations, external emission and strict relocated consumption cover exact arguments, channels, registration, handlers, generic factories, and existing lifecycle machinery. The map adapter's focused runtime suite passes 46 tests. Lint recognizes the new helper by import provenance, including named import aliases and namespace imports; unrelated and shadowed helpers remain outside that recognition.

Final inclusive core runtime verification passes **3,695 tests**, with one intentional skip across 193 passing files and one skipped file. Coverage gates pass: Statements 91.11%, branches 85.07%, functions 89.60%, lines 91.37%. The complete core declaration harness passes after the final map-placement correction, including direct-source checks, accepted/rejected emission, strict relocation, native completion/documentation, and compiler-diagnostic assertions. The separate full UI declaration harness also passes. Final editor measurements precede only the lint-rule completion and report edits, with no subsequent framework/application source changes. Four affected Website documentation suites pass 958 tests; scoped framework/snippet lint and `git diff --check` pass. Core API generation succeeds with zero errors and 267 retained TypeDoc warnings; the new subpath is represented in the generated reference without adding a root namespace export.

The 53-project sweep and UI declaration suite preceded the final map-only correction; subsequent core/map source and emitted checks cover that correction. No claim of a rerun of every application after an unrelated final lint-only change is made.

The final lint follow-up passes plugin source and real-fixture typechecks plus 132 focused tests across three files. Real Oxlint reports exactly five invalid map transformations and zero accepted map transformations. Coverage includes direct, point-free, immediately applied data-last, and multi-stage `pipe` calls. A metadata-only wrapper change followed by a child update is rejected; two metadata-only stages remain accepted. Lead review caught the first-updater-only pipe gap before closure and verified the corrected all-updater inspection.

All five compiler fixtures pass without changing ceilings:

| Fixture                 | Instantiations |   Types |
| ----------------------- | -------------: | ------: |
| Deep, eight levels      |        605,194 |  52,045 |
| Wide, 100 children      |      1,155,836 |  74,206 |
| Commands, 200           |        332,643 |  62,405 |
| Workspace, four groups  |      2,524,670 | 203,903 |
| Workspace, eight groups |      4,284,786 | 277,968 |

### October 24 native editor measurements

Three runs per scenario use official TypeScript `7.1.0-beta` on Node `24.22.1`, with typed nonempty responses, the expected introduced error, cleared diagnostics, and stable workload hashes. These are current absolute measurements, not a paired before/after attribution or a long-session memory guarantee.

| Workflow                                        |       Median |                Range |
| ----------------------------------------------- | -----------: | -------------------: |
| Website route-handler post-edit hover           |       269 ms |           263–301 ms |
| Website post-edit Binding completion            |       275 ms |           268–330 ms |
| Website route-field completion                  |        18 ms |             15–27 ms |
| Website error appearance / clearing             | 625 / 637 ms | 599–643 / 629–648 ms |
| Website cold completed-root Message diagnostics |     3,125 ms |       3,108–3,267 ms |
| Workspace post-edit Binding hover               |       333 ms |           319–358 ms |
| Workspace post-edit Binding completion          |       329 ms |           328–347 ms |
| Workspace completed Block completion            |        61 ms |             55–68 ms |
| Workspace error appearance / clearing           | 236 / 236 ms | 235–251 / 228–240 ms |

The Workspace server RSS sampling peak is 464 MiB across these bounded sessions. Website RSS was not sampled by this scenario. Raw reports: `native-website.json` and `native-workspace.json` in the evidence directory. The optional tsrs guidance remains separate and does not describe these official-compiler measurements.

## Remaining release work and limitations

- The expanded Workspace root emits 110 declaration files and passes strict relocated consumption with a private exact Binding tuple and implementation interface in `src/composition.ts` and `src/block.ts`. The ordinary unannotated control still reaches TS7056. This repairs serialization without changing the public API or weakening channels; it does not establish an editor speedup. Refresh the result against the final frozen core before release. [Boundary and measured costs](workspace-consumer-friction.md#expanded-workspace-serialization-boundary).
- Broad TypeScript ownership detection is not claimed. The lint checks follow established import and Binding provenance, not arbitrary factories or all possible aliases. Named import aliases are followed; later value aliases such as `const bind = makeMapBinding` are not.
- This batch changes production JavaScript. The earlier `f89c6afa2fb1…` packed snapshot and transferred browser/security evidence are not an inclusive artifact for this batch. Freeze the integrated candidate and refresh affected package, installed-consumer, and review evidence before release.
- The dependency audit remains unresolved as recorded in the security report. No fresh Daybreak review or clean audit is claimed here.
- No commit, push, integration merge, public issue edit, or publication is part of this closeout. Publication remains held for the user's approval.
