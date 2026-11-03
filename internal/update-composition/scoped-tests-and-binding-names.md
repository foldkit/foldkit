# Scoped application tests and Binding names

This checkpoint records the application-test and naming work before the newly
requested unified Block API prototype. It does not claim verification of that
later API.

## Application tests

Ordinary application Story and Scene tests return scoped Block-aware runners
from `@effect/vitest`'s `it.effect`. Startup scenarios use `init` and explicitly
resolve Commands. Deliberate existing Models still use `given`. Synchronous
assertions remain synchronous; acquired fixtures remain where the test needs
direct operations, initialized child state, private registrations or alternate
views. No testing API was added.

- Examples and SSR/SSG scaffold overlays: 527 Effect cases migrated across 86
  example files and two scaffold Scene files. The affected non-Workspace app
  suites pass 531 tests across 85 executed files; all 34 non-Workspace example
  source checks pass.
- Workspace: all 153 tests across 20 files pass, with source, application lint,
  Effect lint and formatting checks. The root Scene follows navigation from a
  visible issue to People; retained editor state remains asserted in a Story.
  Thirty-three acquired fixtures remain: 24 for initialized/modified Models,
  identity or direct-operation contracts, and nine for same-acquisition nested
  private Message delivery.
- Website: all 1,528 tests across 39 suites pass after compatible Vitest
  alignment. Typing Game passes all 30 tests across three suites. Their source
  checks also pass.
- The initial UI pass replaces nine ordinary Promise wrappers. Its focused
  eight-suite run passes 368 tests. A wider UI review is still needed: existing
  `it.effect` tests also contain routine `withBlock` wrappers that can use
  `init` and a direct runner. Direct-operation, custom-renderer and lifecycle
  tests continue to need acquired fixtures.

Examples retaining advanced fixtures include cached Query Models, complete Job
Application forms, nested FileDrop delivery, a modified Personal Info Model,
the raw crash assertion and Pixel Art's repeated-iteration benchmark. Mock
server and DOM-resource execution tests retain their existing live environment.
Framework tests inspecting acquisition, provider selection, direct/curried
entry points and delivery provenance retain those specific execution boundaries.

The scaffold's dependency list and release metadata include exact
`@effect/vitest` 4.1.0. Website and Typing Game use Vitest 5.0.3 to satisfy the
adapter's peer requirement. Other installed dependency versions did not change.
The remaining peer check warning is the preexisting Madge 8 / TypeScript 6
constraint; no Effect/Vitest mismatch remains.

## Binding names

Forty-five lexical definitions changed across 63 active files. Field-backed
names retain their field's optional prefix, plural and role words. Workspace
uses `ActiveMemberListboxBinding`, `IssueDetailsBinding` and
`IssueBoardsBinding`. The naming pass preserves runtime IDs, literal values,
object keys, policies and placements; an AST comparison covers all 63 files.

The inventory contains 309 Binding values and aliases. Its thirteen remaining
field/name differences are deliberate:

- Nine necessary private `Base<Field>Binding` policy bases.
- `EntriesAnimationBinding` and `SlotsToastBinding`, which retain a nested role.
- `BadDialogBinding` and `BadSettingsBinding` in labelled lint comparisons.

Auth's private variant bases use `BaseLoggedInBinding` and
`BaseLoggedOutBinding`; its complete public relationships retain
`LoggedInBinding` and `LoggedOutBinding`. Custom accessors and whole variants
use relationship names. Toast's internal runtime record key remains
`EntryAnimationBinding`; lexical variables use `EntriesAnimationBinding`.
DatePicker's internal test references preserve raw versus completed policy
identities. No old-name compatibility aliases were added to feature barrels.

All seven affected consumer source checks pass. The four affected example apps
pass 248 tests; the targeted UI naming suites pass 312. Language-service probe
anchors and their tests now reference the current Workspace symbol. Compiler
workloads, ceilings and historical measurement receipts are unchanged.

## Guidance and generated material

AGENTS.md, scaffold FOLDKIT.md, skills and active Website documentation describe
the same naming, test and public feature-export conventions. Public selectors
interpret the child Model and remain ordinary exports independent of Layer
selection. Published historical posts and labelled Before examples are kept.

Verification logs and rename receipts are retained under `/private/tmp` with
the `foldkit-overnight-` and `binding-naming-migration-` prefixes. The task board
tracks the wider UI pass and the subsequent Block simplification separately.

## Framework and UI runner checkpoint

The subsequent framework pass is committed as `5fbbde2c001911cd24b7d40dbfe99551e059b872`.
Sixteen pure graph cases across eight files return Effects through `it.effect`.
All 44 tests in those files pass, along with the core source check, type-aware
lint and formatting. An AST comparison preserves every test title and assertion.
The exact commit passed independent review.

The UI pass is committed as `9acf13d19d5579511ff1d698e6ebab46368aa404`.
Across 31 files it removes 121 routine `withBlock` calls and raises `it.effect`
declarations from 340 to 812. All 1,334 test declarations and 2,693 assertion
signatures are retained. Five Dialog cases explicitly initialize an open
Dialog and resolve `ShowDialog` before their existing assertions. The complete
UI suite passes 1,357 tests across 68 files against the rebuilt core, together
with source types, both lint configurations and formatting.

The remaining 125 UI acquisitions have concrete uses:

- Direct operation results and reference identity of the initialized Model.
- Deliberately prepared animation, swipe, history or recovery Models.
- Private generated delivery, Codec and Subscription contracts.
- Custom renderers that need the acquired graph-aware view builder and Mount
  capabilities.
- Synchronous rejection checks inside a shared scoped fixture.

Shared Vitest fixtures retain a Promise bridge so their Scope stays alive
through the consuming callback. Ordinary tests no longer request those fixtures.
The per-call exception inventory, exact source/artifact hashes and commands are
in `/private/tmp/foldkit-ui-runner-migration-receipt-20261103.md` and its JSON
receipt. This is a runner checkpoint before the new Block/direct Layer API;
later API migration needs its own source and behavior verification.
