# Next preview review summary

## Comparison

This summary compares the candidate with the last published preview snapshot,
`90746b32d2ca8bc0476de7a051ace396ca590ae0`. The implementation is on
`codex/update-composition-exploration`, building on the construction migration
and the subsequent scoped-test, feedback and InMessage update checkpoints. The
new unified Block/direct Layer prototype is still isolated and is not counted
as completed here. Nothing in this follow-up has been published.

## What changed

- **Layer-based Block construction.** A passive public contract establishes the
  Schemas and authoring types independently of implementation. Effectful
  constructors acquire children through Bindings and return the implementation.
  Child implementation Layers compose through ordinary Effect provisioning.
  Complete init, update, view, Binding, and Step expressions can be extracted
  without passing constructor-local instances through application modules.
- **Separate parent inputs.** InMessages describe a Block's public parent inputs
  separately from its local Message union. Binding operations retain exact
  payloads, Commands, Services, OutMessages, and registration evidence. The
  entry point is `inMessageUpdate`, authored through `makeInMessageUpdate`,
  with the same checked composition helpers as local updates.
- **Scoped testing.** Story and Scene entrypoints acquire the selected graph
  while retaining explicit Command resolution and Model-driven occurrence
  lifecycles. Portable builders can be imported without constructing the graph.
- **Composable updates.** Ordinary exhaustive records stay the default. Focused
  cases and shared `each`, `on`, and `except` transitions form reusable ordered
  bundles around one exhaustive update. Routing runs once; grouping preserves
  the original dispatch Model. Competing OutMessages and lost requirements are
  rejected in source and emitted consumers.
- **Host-owned handlers.** Ordinary constructor-authored Blocks can explicitly
  leave selected handlers to the integrator. Completion retains the original
  handler identities and exact Service/error requirements.
- **Runtime and test fixes.** Removed occurrences cancel their Commands and
  cannot deliver buffered results to replacements. Connection ownership,
  configuration snapshots, and chained embed teardown have regression coverage.
  Dialog closure is observable, stream Mount test emissions can repeat, and
  embed disposal is awaitable.
- **Additional feedback repairs.** Unchanged child folds preserve parent Model
  identity. Generated production SSR/SSG clients register the opted-in DevTools
  overlay, including the standalone build plugin. Erased legacy Command configs
  using `execute` fail with a migration diagnostic instead of silently leaving
  an unusable handler contract.
- **Reported integration fixes.** React embedding renders its unique host ID;
  SSR hot updates invalidate the appropriate environment; relay discovery
  respects PID and network namespaces. Popup cleanup preserves app-owned portal
  roots, and ArrowDown after pointer-opening a Menu selects its first enabled
  item.
- **Repository adoption.** Examples, Website, Typing Game, scaffolds, active
  snippets, and agent guidance use the current contracts and construction API.
  Owned child Blocks live under `blocks/` with explicit barrels. UI imports use
  named component subpaths. Published historical content is preserved.
- **Main and dependency synchronization.** The branch includes actual main
  `a471adb24d`, Effect/platform 4.1.0, matching compatibility constraints, and
  compatible dependency security updates.

The relay repair includes Servaas Vandecappelle's contribution from PR #1877.
The [feedback reconciliation](final-feedback.md) identifies the included reports
and additional candidate findings.

The [main-sync integration](main-sync-integration.md) carries the five
uncommitted edits from `codex/preview-main-sync-20261029` into the current API.
It also resolves the application comments about child selectors, inline
registrations, and child implementation Layers. TypeScript 6 app declarations
verify the additional exported authoring helpers.

## Verification

The canonical InMessage checkpoint passes source checking, the complete core
public declaration driver, strict source-free TypeScript 6 consumers, all seven
unchanged compiler ceilings and focused mutation controls. The full core suite
passes 4,094 tests with one intentional skip and meets its coverage thresholds.
UI passes 1,357 tests, Website 1,528 and the lint plugin 798. The five affected
app source/test scripts pass. Scaffold clean build copies the canonical guide
and leaves no old input-module files.

The earlier release-wide checkpoint covers all 689 example tests, 30 Typing Game
tests and 233 script tests, plus strict packed peers, one physical Effect
runtime and Chromium/Firefox/WebKit consumers. Its Website build, prerender,
rendered smoke tests, lint, dead-code checks and scaffold rehearsal pass. Those
receipts predate the current input migration and the isolated Block prototype;
final release-wide verification must use the eventual API candidate. Individual
receipts retain their exact source and tool scopes.

## Items for sign-off

- Daybreak transfer and review are explicitly on hold at the user's request.
  The prior approved review's six findings have local repairs and independent
  review; that does not cover the later public API changes. No new source is
  transferred unless the user lifts the hold and authorizes it.
- Added Linux-only relay integration tests require a Linux runner. Portable
  tests pass locally; no Docker or Linux execution is claimed.
- The fresh Lustre batch shows the optimized workload 23.5% slower than actual
  main and about 32 KB more gzip. Sample ranges are wide, so its naive median
  improvement does not establish a general speedup. The
  [benchmark report](REPORT.md#current-whole-preview-comparison-with-actual-main)
  preserves all samples, workload parity, earlier comparisons, and limitations.
- The earlier dependency audit retains two moderate tooling findings with
  documented reachability limits. No clean dependency audit is claimed.
- General integration proposals #1871 and #1872 are unimplemented and need a
  separate scope decision. The bookmarked Query factory rename is separate.
  Only #1662 and #1663 have explicit user approval for post-main deferral.

Publication requires the user's approval after the remaining review gates.
