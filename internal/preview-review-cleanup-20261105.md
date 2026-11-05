# Preview review cleanup

This batch follows integrated preview `570ecedddaef` and addresses the user's
application review. Publication and private-source transfer remain held.

## Application organization and guidance

Ordinary UI consumers use a single named namespace import from `@foldkit/ui`.
Examples, Website, Typing Game, DevTools, scaffolds, active snippets and guidance
use the component's namespace for its views, contracts, factories, types,
providers, multi-select variants and test helpers. Public subpath-contract
fixtures and historical migration examples deliberately retain their imports.

Website shared rendering lives with its responsibility: Markdown code blocks,
site layout, deployment banners, GitHub stars and newsletter content. The
`component/` directory is removed. UI route renderers and demo render fragments
live under the UI Block's `view/` directory, with an explicit view barrel.
Non-rendering contracts and domain data remain outside it.

The substantial Home demos use separate contract, composition, initialization,
update, Command, resource and view modules. Their common demo presentation belongs
to Home's view, and the shared reset-duration rule has its own domain module.
Local handler providers compose in each feature's `layer.ts`.

Resolved review comments and decorative application section headers are removed.
Meaningful boundary and teaching comments remain. Testing documentation explains
the selected Block/Layer pair and the different purposes of `init` and `given`.

## Declarative tests

Story returns its final typed Model after verifying every Command was resolved.
`models(steps(...), (before, after) => ...)` compares the Models around a group,
preserving exact Model, Message, InMessage and OutMessage inference. A named
immutable `StoryStepsStep` interface keeps exported groups nameable in relocated
declarations without exposing their internal comparison Symbol.

Public functional simulation steps can return a fresh simulation without naming
private initialization or execution metadata. The runner preserves that metadata
around their public fields; regressions cover both the final Model and later
Command resolution and Message delivery.

Application Story/Scene specs and fixture helpers carry no mutable outer Model
captures. Same-Story identity assertions use comparison groups; completed fixture
Models use immutable Story results. Scene remains Model-opaque. Dismissal during
issue creation uses its existing `Command.keepPending` operation and actual view
interactions. View-only refreshing fixtures derive an explicit immutable state
from a completed loaded fixture; Stories independently cover refresh transitions
and their pending Commands.

Query deduplication tests now start a real request, repeat the input while it is
pending, assert exactly one pending Fetch, and resolve it. Loading presentation
starts through Scene initialization with the startup Fetch retained. Search
execution tests retain production handlers over controlled Services; they check
result normalization, the fetch limit and error mapping. Their Commands belong
in `command.ts` rather than the update implementation.

## Verification

- Repository-wide recursive typechecks pass. Dependent package builds must
  complete in order; an overlapping build produced incomplete UI declarations
  during an intermediate check. Sequential rebuilding restored exact types.
- Core: 4,220 tests pass with the original one skipped test.
- Website: all 1,538 tests pass. Workspace: all 153 tests pass.
- Affected UI suites: 249 tests pass; Typing Game Story: 14 pass; API Cache Query:
  16 pass; DevTools: six pass; lint plugin: 809 pass.
- Core emitted declarations, external emitters, relocated accepted/rejected
  consumers and child-instance controls pass. The exported-group fixture proves
  the private comparison Symbol does not leak into a consumer declaration.
- All eight existing compiler workloads pass their existing ceilings; no budget
  or workload body was changed.
- Active snippets: 129 complete roots, nine behavior cases, relocated
  declarations and both declaration mutation controls pass. The historical hash
  check protects 31 published or migration-before files. Two active bad/good
  comparisons are correctly classified as active examples, not historical posts.
- Circular dependency checks pass; a temporary real cycle is rejected, a parser
  mutation misses it, and the restored acyclic control passes. The parser uses a
  portable digit class. Temporary fixture files are removed.
- Source lint, targeted formatting and whitespace checks pass. Final combined
  push gates and independent exact-commit review remain required.

## Remaining work

The rendering investigation retains its measured gap; the isolated redundant
graph-wrapper experiment has not been represented as a measured speedup or
adopted into this batch. Complete the requested synchronous serialization
contract, then canonical InMessage declaration helper, before freezing the final
candidate. Refresh GitHub feedback, complete final verification and independent
review, request fresh Daybreak authorization for that exact candidate, and keep
publication held for the user.
