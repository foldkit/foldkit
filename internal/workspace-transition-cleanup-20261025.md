# Workspace transition cleanup

## Scope

This report records the `7235df2be5` checkpoint. The subsequent
[Workspace simplification](workspace-simplification-20261025.md) supersedes its
Board navigation cancellation and helper organization. The measurements below
remain scoped to the recorded checkpoint.

This followup addresses retained child state, readable pure transitions, Route
Transition policy, saved-view deletion, and shared control styling. Publication
is held for approval. The comparison baseline is
`52a009896d418711eb0f86552e98323e7bb7b23c`.

## Application behavior and organization

Issue Detail and Board Models are retained by entity identity. Route selection
chooses the visible child; it does not delete hidden state. Pending saves and
comments can settle while their editors are hidden. Refresh uses registered
child operations, preserving dirty drafts and reporting conflicts. A hidden
editor's close result cannot close another editor.

Navigation compares effective background Routes through Route Transitions.
Leaving a Board cancels its transient interaction through a child operation;
opening an issue above the same Board retains that interaction. Initialization
only creates absent identities. Repeated URL delivery preserves existing state.

Saved-view deletion has three explicit cases: delete unrelated metadata,
navigate away from the displayed view with its filters, or repair an open
issue's return destination without closing that issue. Return context comes
from the validated Route rather than a duplicate Model field.

The root `update.ts` is an exhaustive handler record in `update/`. Dedicated
handlers and cohesive transitions live in named sibling files with an explicit
barrel. Conditional initialization uses `initialize...IfMissing`. Local fields,
Commands, and OutMessages use focused helpers where those clarify one purpose;
mixed transitions return complete results. Parent updates use Binding operations
for child transitions and explicit `toParentModel` placement for initialization.

## Drag interaction isolation

DragAndDrop exposes `requestCancelDrag` for parent-driven cancellation. It
preserves ordinary user cancellation and avoids requesting focus on hidden DOM.
Keyboard move invocations and completion Messages carry `keyboardDragGeneration`;
a result from an earlier interaction cannot update or focus a restarted drag,
including when the same item is picked up again. The public Story helper derives
the generation from its selected pending Command. Custom handlers and manual
completion Messages must echo the invocation's generation.

## Shared controls

Reusable static control recipes live in `styles.css` under Tailwind's
`@layer components`. Built-in utilities are applied there, and conditional
classes stay in `clsx`. Text controls, Listbox triggers/options, buttons, popovers,
and Dialogs share these classes. Utility overrides remain available. Computed
style comparisons for list controls, options, and issue controls match the
previous rendering; normal-width browser inspection and production builds pass.

## Binding initialization assessment

A bounded prototype let exact keyed arrays declare `init.insertion: 'Append'`
and use `Binding.init({ key, args })`. Wrapped items reused `init.toItem`.
It passed focused runtime, framework source, and relocated emitted-declaration
acceptance/rejection checks after signature refinement. It did not pass the
unchanged compiler ceilings: the four-child Workspace fixture reached 209,483
Types against a 206,314 maximum; the eight-child fixture reached 281,417 against
a 280,523 maximum. Repeated baseline controls passed. Several smaller encodings
also failed a ceiling or contextual inference. Independent safety and performance
review supported rejecting this encoding.

The prototype is excluded from production source, consumers, and active guidance.
Binding initialization keeps its existing API and explicit parent placement.
No compiler budget was increased. This is an encoding result, not a claim that
TypeScript cannot support any such shorthand. Local experiment details and
patches are in
`/private/tmp/foldkit-workspace-policy-cleanup-20261025/init-prototype/`.

## Final verification

The retained source was frozen independently of the rejected prototype. Its capture
contains 6,810 files with SHA-256
`3c034dc2e272e46bdde0e07e7879d8db97e671f233eccba6b8cbdeca6bebcbc7`.
The final report and task-board result text were updated after that capture;
application and library TypeScript sources did not change.

- Workspace source and all 168 tests across 22 files pass.
- The changed DragAndDrop implementation passes 1,305 UI tests, including 56
  DragAndDrop cases; Kanban passes 22 tests with migrated completion fixtures.
- Final UI source and isolated emitted-declaration checks pass, including strict
  external relocation and rejected wiring.
- The ordinary Workspace root emits 115 declarations, totaling 13,287,962 bytes.
  A strict relocated consumer with `skipLibCheck: false` passes exact Model,
  initializer tuple, direct/curried update, Service requirements, invalid Message,
  and generated-constructor checks. Wrong-view and missing-Binding mutations
  reject at the authoring boundary. Large declaration output remains a cost.
- Focused Chrome browser checks pass for keyboard cross-column placement,
  optimistic pointer placement, and a save settling while its editor is hidden.
- Application/library lint on changed files, formatting, production builds,
  rendered guide inspection, and sampled computed-style comparisons pass.
- Independent integrated source/API review reports no concrete finding.

All five unchanged compiler ceilings pass with exactly the baseline counts:

| Fixture                   | Instantiations |   Types |
| ------------------------- | -------------: | ------: |
| Deep composition, 8       |        589,591 |  50,942 |
| Wide composition, 100     |      1,150,837 |  73,038 |
| Command requirements, 200 |        329,540 |  61,630 |
| Workspace composition, 4  |      2,509,102 | 205,737 |
| Workspace composition, 8  |      4,248,222 | 279,546 |

### Native editor comparison

Three alternating pairs compare exact `52a009896d418711eb0f86552e98323e7bb7b23c`
against the retained candidate using official native TypeScript 7.1.0-beta on
Darwin arm64, Node 24.22.1. Each operation uses a fresh server with identical
request validation. Completion moved with the initialization function from
`src/update.ts` to `src/update/initializeActiveChildren.ts`; the driver supports
both locations. Error appearance and clearing are validated, not merely timed.

| Post-edit operation        | Baseline median (range), ms | Retained median (range), ms |
| -------------------------- | --------------------------: | --------------------------: |
| Binding hover              |         275.0 (272.6–282.8) |         276.6 (276.2–277.8) |
| Binding completion         |         275.6 (256.1–333.0) |         270.6 (257.3–273.3) |
| Completed Block completion |            50.0 (48.9–53.4) |            48.1 (47.7–67.0) |
| Error appearance           |         207.3 (205.4–207.9) |         204.7 (203.4–217.1) |
| Error clearing             |         181.8 (178.6–186.9) |         180.0 (176.5–190.6) |

The ranges do not establish a material speedup or regression. Sampled per-server
peak RSS ranges are 357.1–452.6 MiB for baseline and
348.1–439.7 MiB for the candidate, sampled every 250 ms plus
startup/final observations. These short sessions do not prove long-session
memory stability, Neovim UI latency, tsrs behavior, or universal application
scaling. Earlier assembly-header and historical preview benchmarks describe
different comparisons and are not attributed to this cleanup.

Driver SHA-256: `6ec815c712f0c6ed03a92cd83e9df6aa92162440de0e65b9c961534b74de676d`.

Control workload SHA-256: `a4a3a4332f179a69658c56c2ce0d9f656c0ac2491d61c6da9fb27dbc267f1337`.

Candidate workload SHA-256: `ff0722a9990bfad0081630921eb61fd7b23f0adb488953b1b93265b7ef4ec57e`.

The local evidence directory is
`/private/tmp/foldkit-workspace-policy-cleanup-20261025/`. It contains the frozen
baseline/candidate, six raw native-session reports, `benchmark-summary.json`,
`compiler-budgets-retained.log`, `workspace-declaration-retained.log`,
`root-relocated-retained.json`, `ui-emitted-retained.log`, browser/test logs,
and the computed-style comparison. The comparison can be repeated with
`node packages/foldkit/scripts/profile-block-language-service.ts --scenario workspace --runs 3`
from each snapshot, alternating their order. Run
`node packages/foldkit/scripts/check-block-type-performance.ts` for unchanged
compiler ceilings. Native server spawning and process memory sampling require
normal host process access.

### Release boundary

This is preparation on `codex/workspace-example`. No preview package, integration
branch, immutable deployment, or published Ready snapshot is promoted by this
work. Release approval and final artifact/publication gates remain separate.
