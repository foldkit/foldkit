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
- **Development SSR reloads.** With HMR disabled, requests arriving during
  asynchronous watcher hooks retain a consistent graph. After Vite invalidates
  the entry, Definitions and declarations are reevaluated together, preventing
  duplicate Command registration. Unchanged requests reuse the current entry.
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

## Unified Block API proof

The latest requested single `Block.make` value and direct `makeLayer` return are
prototyped separately. Focused ordinary and generic consumers work, but the
large-graph compiler counts exceed the unchanged ceilings. A mismatched Layer
from another handler selection of the same Query is rejected at Runtime while
TypeScript still accepts it. The [proof report](../block-api-simplification/README.md)
preserves the code, measurements and controls.

The broad migration has not been performed. The candidate retains its existing
Definition/completion API; the `inMessageUpdate` rename and composition parity
are complete. This is outstanding requested work, not an approved deferral.

## Verification

The final [local test checkpoint](verification/release-gates-20261103.json)
passes 9,099 tests across the root test matrix and Typing Game, with 15 existing
skips. All 22 Website browser tests pass against a fresh local server. The Vite
suite passes 387 tests after the SSR fix and deterministic HappyDOM
`MessageChannel` setup. Exact-commit independent review and the mandatory
pre-push hook are enforced separately before pushing.

The canonical InMessage checkpoint passes source checking, the complete core
public declaration driver, strict source-free TypeScript 6 consumers, all seven
unchanged compiler ceilings and focused mutation controls. The full core suite
passes 4,094 tests with one intentional skip and meets its coverage thresholds.
UI passes 1,357 tests, Website 1,528 and the lint plugin 798. The five affected
app source/test scripts pass. Scaffold clean build copies the canonical guide
and leaves no old input-module files.

The fresh [packed checkpoint](packed-release/receipt-inmessage-checkpoint.json)
uses the actual 217-change release plan. Strict peers, one physical Effect
runtime, source-free types, inferred Programs and the existing Chromium,
Firefox and WebKit checks pass. Active manifests and distributions are
unchanged. This verifies the current API, not the isolated Block prototype.

The subsequent [release-gate rehearsal](packed-release/receipt-release-gate-20261103.json)
uses the actual 219-change plan and rebuilt plugin after the development SSR
fix. The same strict installed-consumer and three-browser checks pass. Staging
uses the planned versions and ordinary workspace dependency conversion without
loosening peers. Active manifests and built artifacts stay unchanged.

The [native packed-consumer checkpoint](verification/native-packed-staging-20261103.json)
also passes directly from the checkout. The checker stages exact built package
contents at the actual pending Changesets versions before its strict install,
instead of pairing development version numbers with future peer floors. It
rejects an insufficient release plan and preserves active manifests, built
files, declared peer ranges and all existing consumer/browser assertions.
Prerelease metadata migrations run only in a copied Changesets directory.
All 238 script tests pass; controls reject removed version selection, peer
validation, metadata isolation and migration ordering. This is verification
wiring, with no package Runtime change.

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
- The November 3 Lustre batch shows the optimized workload 12.7% slower than
  actual main and about 32 KB more gzip. Its naive median improves by 20.4%,
  with wide main sample ranges; that does not establish a general speedup. The
  [benchmark report](rendering-inmessage-20261103/README.md)
  preserves all samples, workload parity, earlier comparisons, and limitations.
- The earlier dependency audit retains two moderate tooling findings with
  documented reachability limits. No clean dependency audit is claimed.
- General integration proposals #1871 and #1872 are unimplemented and need a
  separate scope decision. The bookmarked Query factory rename is separate.
  Only #1662 and #1663 have explicit user approval for post-main deferral.

Publication requires the user's approval after the remaining review gates.
