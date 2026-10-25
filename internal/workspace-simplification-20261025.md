# Workspace simplification

## Scope

This pass simplifies the `7235df2be5` Workspace checkpoint around ordinary
application use. Realistic features, failure/retry, retained drafts, notification
activity, and optimistic Board moves remain. Navigation-during-drag orchestration
and a speculative public cancellation operation are removed. Publication is held
for approval.

## Application changes

- `handleChangedUrl` parses and applies the URL, clears the notice, and initializes
  missing children. It neither resolves a Close destination nor cancels drags.
- `route.ts` exposes one `pageRoute(route)` selection: an ordinary Route selects
  itself; an Issue selects its validated return page or All issues. The low-level
  return-target parser is private. URL shapes and filtered/deep links are unchanged.
- Active-child and filter selectors live beside the Model. `navigation.ts` contains
  Model-aware href builders, not child selection or lifecycle policy.
- Boards retain their Models by project identity without route-specific delivery
  gates or navigation cleanup Messages and operations.
- Close handling directly navigates to the selected page. Hidden asynchronous
  saves still settle through their retained keyed Binding.
- Incoming issue updates use child operations directly; the child owns revision
  admission. Focused Command producers describe link navigation without a
  Model-preserving wrapper at each branch.
- Ownership Stories are grouped by concrete behavior in the root update Story
  suite. The separate `ownership.story.test.ts` file and navigation-during-drag
  Stories are removed. Return-URL rejection uses representative public-boundary
  cases rather than exposing a private parser to tests.

## UI contract

The unpublished `requestCancelDrag` operation and `RequestedCancelDrag` Message
are removed. There is no remaining production requirement for that API. Existing
Escape/pointer cancellation keeps its behavior. Keyboard move generations remain:
canceling and restarting a keyboard interaction must not apply a result from the
previous interaction. Those component-level regressions live in UI infrastructure.
The Story helper and migration guidance preserve the generation contract.

## Verification

- Workspace source checking and all 156 tests across 21 files pass.
- DragAndDrop's 52 focused tests and UI source checking pass.
- UI isolated source/emitted acceptance/rejection and strict relocation pass.
- The ordinary Workspace root emits and strictly relocates 115 declarations
  totaling 13,239,555 bytes. Exact Model/init/update/Service checks pass; invalid
  Messages, wrong view ownership, and missing registration still reject.
- All five unchanged compiler ceilings pass with the exact preceding counts:
  deep 589,591 instantiations/50,942 Types; wide 1,150,837/73,038; Command
  requirements 329,540/61,630; Workspace four 2,509,102/205,737; Workspace eight
  4,248,222/279,546.
- The broad Chrome run passes 31 of 32 browser cases. The remaining shortcut
  test used the native host modifier despite an emulated Windows user-agent.
  Matching the shortcut to the browser's advertised platform fixes that harness
  mismatch; the focused rerun passes. All 32 cases are verified across those runs.
- Full application lint, affected UI/E2E lint, formatting, and diff checks pass.
- Independent source review found one stale internal design paragraph; it is
  updated to the current helper and report. No code/API finding was established.

The production TypeScript changes remove a net 78 Workspace lines, plus the
navigation-only UI cancellation mechanism. Most of the improvement is the
removal of a policy and its wiring, not a line-count target.

### Native editor comparison

Three alternating pairs compare the preceding `7235df2be5` implementation
against the frozen simplified candidate, using the same native TypeScript
7.1.0-beta driver on Darwin arm64, Node 24.22.1. The baseline capture's relevant
TypeScript/CSS sources were compared byte-for-byte with that commit before reuse.
The candidate production and unit-test sources remain identical after capture;
final report prose and the E2E modifier correction are outside this workload.

| Post-edit operation        | Previous median (range), ms | Simplified median (range), ms |
| -------------------------- | --------------------------: | ----------------------------: |
| Binding hover              |         316.2 (304.3–335.6) |           298.1 (289.8–302.6) |
| Binding completion         |         279.1 (278.7–296.8) |           280.8 (266.3–295.7) |
| Completed Block completion |            50.5 (47.7–54.3) |              61.3 (53.3–62.7) |
| Error appearance           |         209.4 (206.3–211.7) |           200.7 (195.2–222.6) |
| Error clearing             |         185.0 (182.3–196.8) |           184.4 (180.7–201.5) |

The comparison establishes no material workflow regression or broad speedup.
Completed-Block completion increases by about 11 ms in these samples; Binding
hover decreases by about 18 ms. Both remain bounded to this specific workload.
Sampled per-server peak RSS is 356.2–434.6 MiB before and 361.0–452.5 MiB after,
at 250 ms intervals plus startup/final observations. These short sessions do not
prove long-session memory stability, Neovim UI responsiveness, tsrs behavior, or
universal application scaling.

Candidate capture SHA-256:
`81b91814b4c0bc00a7fecfb808c48d8909e02694376d8a1fff99ddf1e05c1d72`.

Benchmark driver SHA-256: `6ec815c712f0c6ed03a92cd83e9df6aa92162440de0e65b9c961534b74de676d`.

Control workload SHA-256: `ff0722a9990bfad0081630921eb61fd7b23f0adb488953b1b93265b7ef4ec57e`.

Candidate workload SHA-256: `a6d6bdae36e6a5395ca8b8afd5df51d813fe5597e3167184088f2a3882986791`.

Local raw evidence is in
`/private/tmp/foldkit-workspace-policy-cleanup-20261025/`:
`simplified-benchmark-summary.json`, six `simplified-workspace-pair-*` reports,
`candidate-simplified-final`, `root-relocated-simplified.json`, and isolated
declaration verification output. Additional logs are
`/private/tmp/workspace-simplify-{tests,ui-emitted,declarations,compiler-budgets,browser,shortcut}.log`.
Repeat the editor workload using
`node packages/foldkit/scripts/profile-block-language-service.ts --scenario workspace --runs 3`
against both snapshots in alternating order. Compiler ceilings use
`node packages/foldkit/scripts/check-block-type-performance.ts`.

## Release boundary

This development-branch cleanup does not update main or the preview integration
branch, publish packages, change the immutable documentation deployment, or
promote the published Ready snapshot. Publication remains held for approval.
