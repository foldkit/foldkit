# October 30 preview feedback stabilization

This pass follows the user's approval to fix the Binding startup regression,
upstream VirtualList #1862, and reconcile the Work Orders consumer report.
The starting point is `9964c05614d254b530538e70676a4c9b4c1acf9f` on
`codex/preview-main-sync-20261029`, with Effect 4.1.0 already integrated.
The published Ready snapshot remains `90746b32d2ca`.

## Binding startup

[The report](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6532535076)
identifies child Model guard and equivalence derivation during Binding
construction. Direct and keyed Bindings now derive those checks when their
passive init recipes are interpreted. Effect memoizes Schema equivalence by
its root AST, so repeated initialization retains that cache.

The check still validates the selected child and uses its Schema's equivalence.
The proposed structural `Equal.equals` shortcut was not adopted because Schema
annotations and custom equality contracts can differ. Parent completeness,
registration, keyed cardinality, child state preservation and Command lifting
retain their existing checks. Projected and wrapped startup checks already ran
during initialization and did not need the construction fix.

### Reproduction

The reporter's unchanged `bind-cost.mjs` builds 60 distinct child Blocks and
measures only making their Bindings, without calling init. It was run against
the built package before and after the fix, using Node 26.13.0 and Effect 4.1.0.
Each configuration ran in three fresh Node processes with `--expose-gc`.

| Child Union variants | Before retained heap | After retained heap | Before CPU runs  | After CPU runs |
| -------------------- | -------------------- | ------------------- | ---------------- | -------------- |
| 12                   | 17.2 MiB             | 0.8 MiB             | 35, 39, 43 ms    | 15, 15, 15 ms  |
| 40                   | 57.0 MiB             | 2.3 MiB             | 203, 171, 175 ms | 32, 32, 33 ms  |

Heap is the post-GC delta, in MiB. CPU is `process.cpuUsage` for Binding
construction, not wall time or total application startup. Runs were grouped
before and after; these are synthetic measurements, not paired application
request benchmarks. The raw script comes from the linked report; arguments
were `60 12` and `60 40`. Local raw receipts are under
`/private/tmp/foldkit-binding-startup-20261030/`.

The fix moves required work to initialization. It does not claim zero first-init
cost, reduced memory after every child has initialized, or a demonstrated cause
for the reporter's Cloudflare request latency.

The regression test covers both Binding forms, passive recipe configuration,
Schema reconstruction, repeated init, custom equivalence acceptance and changed
child rejection. Restoring either original eager implementation makes its
passive-construction assertion fail. Existing initialization tests retain
invalid parent, missing/duplicate key, foreign graph and Command coverage.

## Message-free keyed fields

Writing the startup regression exposed a separate supported-case defect:
`Schema.Never` children in keyed field Bindings passed public types but required
an impossible Message mapper at runtime. The keyed-field path now uses the same
internal unreachable mapper as general keyed and map storage.

Direct child arrays, wrapped child arrays and optional wrappers construct
without delivery configuration. Public and erased callers still cannot supply
Message delivery for a Message-free child. Source and emitted fixtures retain
the exact `never` Message channel. Removing the repair reproduces the original
runtime error in the new focused regression.

## VirtualList #1862

[The issue](https://github.com/foldkit/foldkit/issues/1862) describes sorting a
Window-backed list while its origin remains below the viewport's top. A negative
external offset now retains an Offset anchor before row/end anchoring is
considered. Within-list row anchoring and Self history behavior remain in place.
The change applies to Window and Ancestor containers.

Source regressions fail without the fix for both row and follow-end selection.
Browser regressions cover external reordering and ordinary in-list anchoring.

## Work Orders consumer report

The [report](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6512266466)
and its split-file PoC were inspected against the current branch.

| Reported friction                                                                    | Disposition                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Html Block passed to `Program.make`, including Element `flags`, collapses to `never` | The existing final overload preserves the root-view diagnostic and recommends `Program.makeElement`. No callback or routing validation is relaxed.                                                                                 |
| Missing Binding registration produces errors in several files                        | Existing compile-time rejection is retained and source/emitted diagnostic coverage checks its reason. Troubleshooting identifies the exact Binding identity and `composition.ts` repair. Multiple downstream errors can remain.    |
| Container requires an id, discovered only at Runtime                                 | Runtime guide, preview upgrade guide and Program TSDoc now state the unique, nonempty id requirement before Program construction, plus Flags/view differences.                                                                     |
| Layer assembly was guessed from opaque declarations                                  | Active Layers guidance shows `Layer.mergeAll`, attached handler recipes, registry aggregation and automatic collection of child recipes. No new Command aggregation API is introduced.                                             |
| Parent policy must block interactions while accepting child completions              | Existing `delivery.toUpdateContext` is documented with child/parent snippets. Runtime coverage proves completion delivery remains active and current parent policy reaches each handler. No parent interception API is introduced. |

### Local diagnostic review

Review caught an unsafe intermediate diagnostic encoding: mapping `keyof` over
several different view errors could produce an empty object and admit invalid
root unions. The final encoding distributes over each diagnostic. Public source
and relocated emitted fixtures reject Html/viewless Block unions and mixed
view-input function unions. Both new rejection directives failed before the
repair. Valid union, Service and portable consumer controls pass.

This intermediate defect was introduced and removed during this pass. It was
never part of the published preview and is not counted as a shipped regression.

## Scope held outside this pass

The user's accepted stabilization scope does not adopt Sam's replacement
architecture (#1858/#1860), InMessages (#1863), new parent Message interception,
or awaited EmbedHandle disposal (#1864). Existing general hydration, form,
DevTools and bundle tracks remain separate. This pass does not claim those
proposals have been implemented or close them.

## Verification

Completed integration gates:

- Published-package build and repository-wide lint, including application and
  Effect rules.
- Repository-wide typechecks, including Workspace, Website and Typing Game.
- Core: 3,927 tests passed, one skipped; UI: 1,343 tests passed, with coverage gates.
- VirtualList: 103 source/Story/Scene tests and 40 Chromium desktop/narrow,
  WebKit and Firefox browser cases. The browser run includes all eight new
  sorting cases, existing resize anchors and underfilled-end behavior.
- All seven unchanged compiler-performance ceilings.
- Source and relocated emitted compiler diagnostic assertions.
- Full core/UI source, emitted and relocated declarations, including native
  completion and inferred configuration documentation. The final distributed
  diagnostic encoding also passes the focused Program external/relocated gate.
- Website production build, prerender (226 routes), rendered desktop review of
  the core guides and local preview upgrade guide, and repository formatting.

A separate agent must review the exact local commit before it is pushed.
The candidate still needs integration into `codex/layers-and-submodels` through
the existing release workflow. Publication requires the user's approval. Local
fixes do not advance PR #1655's published Ready entry points.
