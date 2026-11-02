# Constructor migration review summary

## Scope

The implementation is frozen at reviewed source
`db69206779b4e4c37d9cefe02acb21ca3d2e9ed3`. This report covers the construction
and InMessage migration from preview source `be0cb381`, its dependency repairs,
and the subsequent three feedback fixes. Earlier release preparation and main's
Effect 4.1 integration have their own entries in the release task board.
Publication requires separate approval.

## API changes

- A Definition declares the Block's independent public contract once. Parents
  import `FeatureBlock = FeatureDefinition.contract` to author their Model,
  Bindings, Steps and views without importing the child implementation.
- `Definition.makeBlock(Effect.gen(...))` completes the implementation. The
  constructor yields registered Bindings and returns acquired `children`
  alongside the Composition-authored init, update, receive and view plans.
- Ordinary Layers supply child implementations and construction dependencies.
  Attached Command handler constructors own their request Services. Model
  initialization stays deferred, updates stay synchronous and pure, and Runtime
  occurrence lifetimes govern effects and cleanup.
- Complete typed builder expressions work inline, as constructor-local values,
  and in extracted modules. Application roots need no explicit preparation
  producer or assembly annotation. Whole Workspace, Job Application and Website
  exports pass strict consumers using only emitted declarations.
- Parent requests use a separate optional `InMessage` union and exhaustive
  `makeReceive` record. `RequestedOpen` generates `Binding.requestOpen()`;
  `InformedOfRouteChange` generates `Binding.informRouteChange(...)`. Local
  Messages and child OutMessage policies retain their own responsibilities.
- Block-aware Story and Scene entrypoints acquire the selected graph in Scope.
  Ordinary test steps and acquired transitions stay synchronous; normal Layers
  select implementations and Services for the test.

Examples, Website, Typing Game, UI, Query, scaffold templates, lint recognition,
skills and active documentation have been migrated. Published release content
retains its historical APIs. Thirty-five useful operation adapters remain for
positional, generic, defaulting and existing local-Message contracts: 29 in UI
and six in Query. The native assembly API remains available for advanced library
consumers and its framework fixtures.

## Feedback fixes

- Dialog emits `Closed` when an open Model closes after native show failure,
  resource acquisition failure or unmount. Parent close policy can handle all
  these paths through the existing OutMessage.
- `Scene.Mount.emit` supplies subsequent declared Messages from a resolved,
  active stream Mount. The original source, occurrence, args, payload and
  pending-effect boundaries are enforced.
- `EmbedHandle.dispose()` immediately disables the handle and returns the same
  Promise until teardown completes. Hosts can await it before a different
  Program reuses the container, including when cleanup is asynchronous.

## Verification

| Check                                            | Result                                                                                                                 |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Integrated source/runtime/public consumer groups | All 22 pass                                                                                                            |
| Core                                             | 4,030 tests pass, one intentional skip                                                                                 |
| UI                                               | 1,354 tests pass                                                                                                       |
| Website                                          | 1,527 tests pass; production build and 225-page prerender pass                                                         |
| Example and Typing Game test scripts             | All 35 pass, 720 tests                                                                                                 |
| Compiler performance                             | All seven original fixtures and ceilings pass unchanged                                                                |
| Declarations                                     | Core/UI source, emitted and strict relocated consumers pass                                                            |
| Packed SSR consumer                              | Strict peers, one Effect runtime, public types, SSR and default Chromium hydration/refusal checks pass                 |
| Maintenance                                      | Standard/Effect/application lint, formatting, dead-code, dependency cycles and applicable package/changeset gates pass |
| Independent review                               | Migration, dependency commit and exact feedback-fix commit approved                                                    |

[Stabilization evidence](STABILIZATION.md) separates the final combined receipts
from earlier checkpoints. Test totals are verification counts, not a count of
distinct shipped bug fixes. The Website build reports zero TypeDoc errors with
484 core and 21 UI documentation warnings.

## Performance and dependencies

The final unchanged Lustre batch compares actual main with `db69206779`:

| Variant   |     Main | Candidate | Change |
| --------- | -------: | --------: | -----: |
| Naive     | 529.8 ms |  644.1 ms | +21.6% |
| Optimized | 203.7 ms |  256.3 ms | +25.8% |

These are instrumented execution totals, excluding boot, rather than wall-clock
completion times. Both bundles add about 40 KB gzip over main. All 32 samples
and the earlier batches are preserved in the [rendering report](rendering-final/REPORT.md).

The unchanged incremental Lustre comparison against the preceding preview
measured 1.7% higher naive execution time and 4.4% lower optimized execution
time. These mixed samples do not establish equivalence or a general speedup.
Both bundles add about 7.9 KB gzip. That comparison uses `be0cb381` and `e6f141f3`;
it measures the migration's aggregate change in a separate batch. Cross-batch
differences do not establish the performance effect of the three feedback fixes.

Targeted dependency repairs removed 33 of 35 workspace advisory records. Two
moderate tooling findings remain, glob and minimatch; there are no critical or
high findings in that refreshed audit. Ordinary packed MCP/scaffold consumers
install a graph with zero production audit findings. The [dependency report](dependency-advisories/README.md)
explains the different scopes and why incompatible overrides were not forced.

## Open decisions

- #1868's same-dispatch post-update policy is unimplemented. The prototype's
  inline inference does not meet the required authoring experience. The next
  isolated experiment awaits approval after automatic approval review rejected
  it. No approved deferral is claimed.
- Fresh Daybreak source transfer awaits explicit authorization for the reviewed
  final candidate and relevant history. No source from this migration has been
  sent to that service.
- The earlier irreparable prerelease-lockfile report needs the original inputs
  to reproduce. Ordinary workspace upgrade cases pass; no fix is claimed for
  the unreproduced report. The release task board preserves that limitation.
- The measured bundle/runtime costs and two tooling advisories need release
  review. This report does not accept those costs on the user's behalf.
- #1662 automatic OutMessage propagation and #1663 derived/default view slots
  retain the user's explicit deferral until after the Blocks/Layers merge.

## Review starting points

- [Workspace Definition](../../examples/workspace/src/definition.ts),
  [Composition](../../examples/workspace/src/composition.ts),
  [implementation](../../examples/workspace/src/block.ts), and
  [Story tests](../../examples/workspace/src/story.test.ts).
- [Compact Counter root](../../examples/counter/src/application.ts).
- [Complete constructor-authored chat proof](contract-provisioning/src/roomCollection.ts).
- [Adoption inventory and deliberate boundaries](ADOPTION.md).

The shared checkout's concurrent DOM changes are preserved. The reviewed work
is on the isolated migration branch. No external push or publication occurred.
