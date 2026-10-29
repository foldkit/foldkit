# Blocks + Effect Layers stabilization feedback

The user subsequently explicitly deferred #1662 and #1663 until after the
Blocks + Effect Layers work merges to main. The original assessment below
retains its historical scope. These two proposals are not requirements for
the current preview.

The [SSG contribution reconciliation](ssg-preview-1814-reconciliation-20261027.md)
records the later #1814 patch and evening feedback refresh. It strengthens the
existing #1811 repair without relabeling earlier verification.

The [preceding SSG stabilization addendum](preview-stabilization-1811-20261027.md)
records #1811's repair and affected verification at `f15fa1646241`.
The [preceding summary](preview-stabilization-final-20261027.md) retains the
full source/performance checkpoint at `93c49c77b6d2`.
The original inventory below retains its assessment pin. Later bounded refreshes
found #1810 and then no further updated repository issues or PRs through
16:53 UTC. The [retained refresh](stabilization-final-20261027/feedback-refresh.json)
also reads #1810's unchanged body and zero comments back.

## Late report #1811

[#1811](https://github.com/foldkit/foldkit/issues/1811), posted at 17:36 UTC,
reports Home HTML at an SSG scaffold's declared `/about` path. The 18:05 refresh
finds this single new item and zero replies. Raw HTML and JavaScript-disabled
navigation reproduce it in the prepared candidate; hydration hides the error.
Earlier coverage used `/about/` without JavaScript and missed the mismatch.

Fixed in `f15fa1646241`: preview resolves directory-index pages using Vite's
actual client output before fallback, retaining Vite-owned serving and existing
request boundaries. All350 plugin tests, including17 actual-preview cases,
the strengthened3-case example suite and a physically packed-plugin SSG smoke
pass. Independent review closes the initial output-directory finding and the
exact-source Daybreak addendum passes. [Scope and evidence](preview-stabilization-1811-20261027.md).
No application API changed. Source comparison suggests a preexisting mismatch;
main and deployed hosts were not executed. Publication remains held.

## Late report #1810

[#1810](https://github.com/foldkit/foldkit/issues/1810) was posted at 15:48 UTC,
after the original exhaustive inventory. All four points have dispositions:

1. Incomplete-record diagnostic priority is reproduced and remains a compiler
   presentation limitation. Completeness-first troubleshooting is added;
   existing rejection and registration checks remain intact.
2. Mixed local/connected branches have paired checked before/after snippets
   beside the dedicated diagnostic. Unrelated plain-result handlers remain valid.
3. Applied/deferred Step composition has paired checked examples explaining
   when the registered Composition supplies graph evidence.
4. Date/HashMap values inside opaque inspected snapshots reproduce the actual
   preservation failure through Program/Runtime callbacks. Failure now warns
   once per episode and invalidates only that Runtime's stale preserved entry,
   preserving its live Model. Valid subsequent snapshots recover. The plugin
   queue and declared rich-value restoration are tested. The complete original
   browser/HMR sequence is not reproduced; arbitrary opaque values are not
   promised lossless preservation. Foldkit and the Vite plugin must update
   together for invalidation.

[Exact source, emitted, runtime and snippet evidence](stabilization-final-20261027/issue1810.json).
All 17 final integrated gates and the fresh nine-package rehearsal pass at the
new pin, including 33/33 Workspace browser cases. This does not relabel the
earlier inventory's implementation or close the remaining proposals below.

## Result and scope

Checked on October 27, 2026, at **15:00 UTC**, against local implementation
`8b4180822316edd736809ab65136c850be488281` on `codex/workspace-example`.
The published preview remains
`f3be22cfeefed437164ad614d08b16d9000e0703`.

No newly reported, unaddressed Blocks/Layers correctness defect was established
by this feedback reconciliation. This is an inventory and source-evidence
assessment, not a fresh certification of the combined release candidate. The
source, emitted-declaration, installed-package, performance and final-review
gates still need their current candidate pins.

It would be inaccurate to say that every requested feature was implemented.
The original migration problems have dispositions and regression evidence;
known diagnostics/performance limitations and nonadopted integration proposals
remain explicit below. No new deferral is authorized by this report.

The user selected stabilization for the next preview and expects one or two
later previews depending on feedback. General UI, Query, broad plugin APIs and
unrelated compatibility work do not become release requirements merely because
they were submitted while this preview was open.

## Public coverage

All reads were refreshed from GitHub. Connector results were supplemented by
network-enabled `gh api` reads for timestamps, states and exhaustive pagination.
The first sandboxed CLI request could not reach GitHub; its network-enabled
retry succeeded. No authentication failure or unavailable feedback was inferred
from that sandbox result.

| Surface                                                                                    | Coverage and result                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Preview PR #1655](https://github.com/foldkit/foldkit/pull/1655)                           | All **12** conversation comments, **0** submitted reviews and **0** inline review threads. The current description still points at the published `f3be22cfeefe` snapshot.                                                                 |
| [Performance help #1737](https://github.com/foldkit/foldkit/issues/1737)                   | Closed; all **10** comments. The last is the scoped closure, `6369160547`. No later reply.                                                                                                                                                |
| PRs targeting `codex/preview-followups`                                                    | **12** PRs, listed below, including all **17** conversation/review comments, **0** submitted reviews and **0** inline review threads.                                                                                                     |
| PRs targeting `codex/layers-and-submodels`                                                 | **10** historical integration PRs: #1634, #1656, #1693, #1694, #1695, #1696, #1705, #1729, #1801 and #1802. Their closed states do not establish a new candidate's verification.                                                          |
| PRs referencing `1737`                                                                     | **9** matches: #1655 plus the eight performance-contribution PRs below. All are covered by the other reads.                                                                                                                               |
| Recent repository activity                                                                 | `repo:foldkit/foldkit updated:>=2026-10-26`, all states and all pages: **45** issues/PRs. These include label/metadata updates, not 45 new reports.                                                                                       |
| Broader issue discovery                                                                    | `repo:foldkit/foldkit is:issue (Blocks OR "Effect Layers" OR Composition OR Binding OR "preview")`, all states: **86** results, screened by subject and existing release scope.                                                           |
| Release-related issue bodies and discussions                                               | **19** issue bodies and all comments: #1646, #1662, #1663, #1678, #1692, #1698, #1704, #1706, #1707, #1708, #1709, #1726, #1759, #1760, #1767, #1772, #1776, #1777 and #1779. Only #1646 and #1709 have comments, one each.               |
| [Linked integration discussion #1781](https://github.com/foldkit/foldkit/discussions/1781) | Full body, **0** comments/replies; last updated October 25, 19:44:10 UTC. Its Blocks/testing findings map to the rows below. Query, Form, alchemy and agent proposals remain separate.                                                    |
| [Lazy-composition PR #1799](https://github.com/foldkit/foldkit/pull/1799)                  | Body, head, diff and discussion assessed after the broad search found it outside the preview bases. **0** comments/reviews/inline threads. Targets `main`, explicitly replaces #1580 and implements the separately scoped #1559 proposal. |

The last #1655 report is
[comment `6431232046`](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6431232046),
created and updated **2026-10-27T01:11:59Z**. The preceding foldkit-plus report
`6415641973` is unchanged from **2026-10-26T12:09:35Z**. No later report or
changed performance-contribution head was found in this pass.

## Migration reports: current disposition

The [original closeout](preview-feedback-closeout.md) preserves **38 numbered
source findings in 44 rows**, including the overlapping #1698 report. Its older
"local"/"unreleased" labels refer to historical checkpoints, as its status
section explains. Do not recreate those fixes because an issue is still open.

| Public report                                                                                                                                                                                                       | Disposition and implementation evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [First app, `6251453995`](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6251453995)                                                                                                                     | F1–F8d: registered Composition requirements are retained; deferred Definition Steps and generic `makeModifyFieldsFor` are supported. Init/combined-Step defects have runtime/source/emitted regressions. Shared views use complete Composition contracts. Map storage is implemented; the current method spelling supersedes the historical standalone form. Dialog close still reports its normal OutMessage; Command matching uses identity. See original F rows, `src/block/operationGraph.test.ts`, `initialization.test.ts` and the current [map-method proof](map-binding-method-adoption-20261027.md).                                  |
| [Second app, `6265510467`](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6265510467)                                                                                                                    | S1–S8: one Foldkit/Effect identity at adapter boundaries, coherent preview installs, exact handler inference and canonical generator construction are documented. Recommended lint permits a passive handler generator without `yield`. Resource examples, scaffold ownership and Layer/Program migration guidance are updated. No hand-maintained `Command.HandlersOf` aggregate alias is supplied. Existing producer inference is the supported contract.                                                                                                                                                                                    |
| [Additional API/docs, `6266157465`](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6266157465)                                                                                                           | A1–A4: `managedResources.layer` is implemented, with empty/all-attached/mixed registries, reserved key and metadata enumeration checks. Subscription APIs accept field records; an existing Struct supplies `.fields`. Rendered documentation exports resolve `::Snippet`; raw repository Markdown keeps canonical references. Resource identities belong in passive owner modules. [Aggregate proof](aggregate-handler-layer-assessment.md), `declaration-tests/managed-resource-registry.*.ts`.                                                                                                                                              |
| [Website, `6266972848`](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6266972848)                                                                                                                       | W1–W10: unapplied Steps and unsafe connected/local channel mixtures are rejected; record-only updates preserve per-Message contracts. Nested application callbacks remain invalid ViewInputs. Operation context remains explicit. Test-only `toParentMessage` removes irrelevant view inputs; tests may deep-import owning Commands. Commands retain explicit `.layer` composition. Import direction and generic/owner-specific view helpers are documented. [Composition closeout](composition-feedback-closeout.md), [headless-test proof](test-parent-message-assessment.md), `declaration-tests/dual-update.*.ts`.                         |
| [Earlier issue #1698](https://github.com/foldkit/foldkit/issues/1698)                                                                                                                                               | I1–I7: nested-Step rejection, interactive Toast rendering and identity/version-aware Toast test helpers are implemented; Mount-bearing shared views, owner-scoped Commands, prior-parent-state coordination and migration testing have supported patterns and source/emitted proofs. No second implementation is needed. `src/update/operationOutput.test.ts`, `ui/src/toast/scene.test.ts`, `ui/src/toast/publicFixture.test.ts`, `src/block/nestedMountCapabilities.test.ts`.                                                                                                                                                                |
| [Large MyRemotely app, `6325362294`](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6325362294)                                                                                                          | The [consumer-friction assessment](workspace-consumer-friction.md), Workspace example, scale fixtures and later framework closeout address its actionable ownership, testing, mounted-helper and diagnostic cases. Direct beta migration remains the chosen contract; no incremental compatibility bridge or codemod is planned. The user explicitly preferred agent-assisted migration over codemods. Exact declarations and large-root latency remain qualified below.                                                                                                                                                                       |
| [Followup migrations, `6361232131`](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6361232131)                                                                                                           | Published consumers reported passing their upgrades. Repeated graph, aggregate Layer and testing requests are covered above. [Compiler diagnostics](composition-compiler-diagnostics.md) improve unannotated assembly, primary view, missing handler and invalid init errors without weakening checks. [Program checker repair](program-checker-order.md) addresses unrelated-file/default-checker failures. Resource organization, package identity/lockfile troubleshooting, generic view examples and generated documentation paths have dispositions in the original ledger. Intentional context/Command-provider boundaries are retained. |
| [DateTime/combined OutMessage, `6384975056`](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6384975056)                                                                                                  | Both fixed. Standard Inspectable keys permit Effect DateTime/TimeZone data; added callbacks remain rejected. Data-first `combineSteps` preserves attached OutMessages through arrays/nesting and emitted declarations. [Exact proof](preview-type-feedback-20261024.md), `src/html/viewInputs.test.ts`, `declaration-tests/view-inputs.*.ts`, `combined-outmessage.*.ts`, `src/block/combinedOutMessage.test.ts`.                                                                                                                                                                                                                              |
| [Reciprocal graph, `6387080292`](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6387080292), [#1772](https://github.com/foldkit/foldkit/issues/1772)                                                     | Fixed by collecting reached placements' direct channels once. Missing registration, self/reciprocal policies and parent/child display-name collisions remain rejected. Original twelve-Binding reproduction fell from 10,309,506 to 391,295 instantiations in the isolated proof; that is not an editor speedup claim. [Closure proof](reciprocal-policy-closure.md), `src/block/reciprocalCoordination.test.ts`, `declaration-tests/reciprocal-coordination.*.ts`.                                                                                                                                                                            |
| [Event-sourced integration, `6398999418`](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6398999418), [#1646 reply `6398725318`](https://github.com/foldkit/foldkit/issues/1646#issuecomment-6398725318) | See the six-part assessment immediately below. The reported cast-erasure workaround is not accepted as a safe API repair.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| [foldkit-plus, `6415641973`](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6415641973)                                                                                                                  | Two approved additions shipped: duplicate `OnMount` rejection and grouped Block-customization guidance. Runtime-local envelope admission is clarified. Broader proposals are not implemented. [Prior explicit assessment](preview-feedback-20261026.md) and current proposal table below.                                                                                                                                                                                                                                                                                                                                                      |
| [Dynamic plugins, `6431232046`](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6431232046)                                                                                                               | New question assessed below. No new same-Runtime loading, hot-replacement or state-extraction API is introduced. A public answer has not been posted by this read-only task.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

### Event-sourced integration details

1. **Event before reply / #1780:** Story already permits ordinary Messages while
   Commands are pending. `Scene.Command.keepPending` selects one exact pending
   invocation and leaves assertions, resolution and final completeness intact.
2. **Model-dependent Messages / #1783:** `Story.messageWith` and
   `Story.Subscription.from(record).emit` are implemented, preserving exact
   registered paths, decoded inputs and ambiguity rejection. Simulation does
   not execute Streams or Runtime admission. [Contracts and verification](testing-event-delivery.md),
   `declaration-tests/testing-event-delivery.*.ts`.
3. **Generic Service / #1777:** current attached-handler construction cannot
   establish safe requirements from an unresolved generic Service identifier.
   A caller-owned `toLayer` after the key becomes concrete is the documented,
   source/emitted/relocated supported boundary. No cast or weakened construction
   check is accepted. [Assessment](generic-construction-requirements.md),
   `declaration-tests/generic-service-factory.*.ts`.
4. **Wrong final overload / #1776:** the invalid Command is rejected, but its
   diagnostic can blame the no-args overload. Bounded signature alternatives
   exceeded the then-current compiler ceilings or broke inference. Active
   troubleshooting was added; the diagnostic itself remains imperfect.
   [Measured assessment](command-diagnostic-assessment.md).
5. **Completed `subscriptions` name:** the member is the Block's registered
   graph, not a free extension slot. Keep a differently named deliberate test
   extension or import the local registry; do not overwrite a completed member.
6. **Live feed / #1785:** LiveQuery is an experimental new data primitive, not an
   established Blocks/Layers stabilization requirement. DevTools correlation
   #1778 is also general tooling work. The reported checker-order defect #1779
   is fixed; [source-order mutations and five checker counts](program-checker-order.md)
   retain exact Program/Service rejection. Repeat that matrix on the final head.

## Exact contribution heads and outcomes

All twelve preview-followups PRs are still publicly open. Open status does not
mean their ideas were ignored or their supported portions are missing.

| PR and checked head                                                                               | Retained outcome                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#1753](https://github.com/foldkit/foldkit/pull/1753), `24e13bbbfe0d09e9c985b064b8aa85859c9f2c57` | Explicit Attribute union adopted; current `src/html/index.ts` contains the direct union. Constructors and runtime behavior retain their contract.                                                                                                          |
| [#1755](https://github.com/foldkit/foldkit/pull/1755), `f029ac887fe5581e91f470486dbe2af7967f9b39` | Failed direct-import boundary retained as evidence; not a performance fix.                                                                                                                                                                                 |
| [#1756](https://github.com/foldkit/foldkit/pull/1756), `a5e9638f2b648f2df2d3c57d93a0fa31fb00b04c` | Earlier safe checker reductions retained. Final lookup-index alternative rejected after a paired comparison: root completion flat, route completion 252→272 ms. [Exact assessment](block-model-boundary-assessment.md#final-bounded-community-comparison). |
| [#1757](https://github.com/foldkit/foldkit/pull/1757), `13f5fba86366a2bdb1e4b4521f20fff8e448bc7d` | `Composition.implement` not adopted; checked preparation/assembly supplies the selected public boundary. Experiments inform the ledger rather than adding a competing assembly API.                                                                        |
| [#1762](https://github.com/foldkit/foldkit/pull/1762), `ebdc21eabd81087372ebf29f5659077770ad53cd` | Terminal-root API not adopted. Its ordinary-Block counterexample produced the retained alternative-root Service guarantee fix, `3f043be3ea5ad92cc21306449981022044793376`; `declaration-tests/program-union-services.*.ts` retains the proof.              |
| [#1763](https://github.com/foldkit/foldkit/pull/1763), `34c31d3499ab0a881299f94ae1e7787a7eebb0dd` | Finite handler-key grouping rejected after target diagnostics stayed flat.                                                                                                                                                                                 |
| [#1764](https://github.com/foldkit/foldkit/pull/1764), `daa84588fe610e34ddd6a5430f0eed6d1a2b01d8` | Named `ReplaceEffectsLayer` callable retained; historical paired root diagnostics improved roughly 8–9%. `assembleAs`, generated contracts and variance changes not adopted. Current `src/block/definition.ts` retains the named interface.                |
| [#1765](https://github.com/foldkit/foldkit/pull/1765), `f26146a64a9d20afdd4efd262f1b8a36161460dd` | Constructor workload retained as a measurement tool; fixed local-first order limits its causal interpretation. Not a performance fix. [Results](block-model-boundary-assessment.md#later-bounded-community-experiments).                                   |
| [#1780](https://github.com/foldkit/foldkit/pull/1780), `bf56e8b73cb45b590c27ee5c51baeffd59b56ac7` | Concrete Scene pending-Command use case adopted, as described above; no redundant Story operation.                                                                                                                                                         |
| [#1783](https://github.com/foldkit/foldkit/pull/1783), `225772961bc462501dd4da1da364ccdd8f46816a` | Focused Story conveniences adopted with current registration and pending-completeness contracts.                                                                                                                                                           |
| [#1785](https://github.com/foldkit/foldkit/pull/1785), `ae096d61791920aa071c7ba052e1636bc59cbbe3` | LiveQuery proposal assessed; not included in stabilization. No fresh correctness certification of that PR is claimed.                                                                                                                                      |
| [#1800](https://github.com/foldkit/foldkit/pull/1800), `3bb7253156fb4f5bb929529c9d491437f8a5a7e4` | AgentContext proposal and both replies read. Separate production agent API; not included in stabilization or represented as reviewed for adoption.                                                                                                         |

The existing [boundary assessment](block-model-boundary-assessment.md) and
[original closeout](preview-feedback-closeout.md) preserve failed encodings,
paired measurements, safety/declaration results and the distinctions between a
failed encoding and a demonstrated TypeScript limitation. No rejected control
has become a release fix merely because its PR remains open.

## Outstanding limitations and proposal boundaries

### Documented limitations, not missing adopted implementations

- **#1709:** full composed Message/Layer expansion and cold-root diagnostics can
  take seconds on official native TypeScript. tsrs is an optional tested editor
  recommendation, not the CI compiler or a universal fix. Long-session memory
  stability is unverified. [Publication scope](preview-publication-20261026.md),
  [latest map-method comparison](map-binding-method-adoption-20261027.md).
- **#1776:** misleading final-overload errors remain despite sound rejection and
  added troubleshooting. The bounded assessment is complete, not a compiler
  diagnostic fix or proof that every future encoding would fail.
- **#1777:** unconstrained generic attached-Service factories require the
  supported concrete caller-owned implementation boundary. A one-stage generic
  factory that yields an unresolved Service key is not newly supported.
- **Declaration scale:** ordinary Workspace root emission and relocated use are
  verified at their recorded checkpoints; declarations remain large. The
  historical 32-group synthetic serialization limit and purposeful exact
  Binding-tuple naming remain disclosed. [Clean assembly proof](workspace-clean-assembly-20261025.md).
- **Rendering cost:** the prior repeated Lustre comparison improved the optimized
  preview workload about 12.7% but remained roughly 20–22% above main in that
  batch. These are workload totals, not per-keystroke latency. Refresh the
  candidate comparison before release; do not attribute old timings to the new
  Workspace factoring. [Runtime investigation](preview-runtime-investigation-20261026.md).
- **Current compiler budget accuracy:** the approved Definition-method
  reevaluation deliberately revised only Workspace-four-group ceilings to
  2,642,699 Instantiations / 229,173 Types. It is false to claim all original
  ceilings are unchanged at this head. Other five ceilings and fixture sources
  are unchanged. The report retains the original-budget failure, exact revised
  counts, editor pairs and tradeoff. [Decision](map-binding-method-adoption-20261027.md#compiler-costs-and-deliberate-ceiling-revision).

These are explicit remaining costs/contracts. This inventory does not fabricate
user approval to defer a reported correctness bug. The earlier wrongly deferred
Record/HashMap, ManagedResource aggregation, pending-Command inspection and
diagnostic work is implemented and is not on a deferred list.

### Proposals not adopted for this stabilization

| Request                                                                                                                                   | Current boundary / disposition                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#1662](https://github.com/foldkit/foldkit/issues/1662), automatic permitted OutMessage propagation                                       | Exact explicit `fold`/`forward` policies remain required. Identity-forwarder elimination and complete checked remainders remain design work. This older followup is not an implemented convenience; no new implementation or explicit user-approved deferral is claimed here. |
| [#1663](https://github.com/foldkit/foldkit/issues/1663), derived/default view slots and static collision checks                           | Explicit stable `slotId` plus mandatory runtime duplicate-boundary detection remain current. `src/html/boundary.ts` and `html/block.test.ts` cover collisions, distinct parents and lazy hits. Derived defaults/additional lint/type checks remain an investigation.          |
| [#1692](https://github.com/foldkit/foldkit/issues/1692), owned OutMessage folds                                                           | The concrete owned `makeOutMessageFold`/`makeOutMessageForward` use cases are implemented, including extracted/refined/source/emitted contracts. Its open checkbox is stale tracking, not a missing API.                                                                      |
| foldkit-plus operations-as-Messages and portable envelopes                                                                                | External inputs use decoded parent facts/Ports and registered Binding operations. Runtime generations are local stale-work identities, not a portable protocol or sender authentication. No generic `exposeOperations` or wire-envelope API.                                  |
| foldkit-plus every-transition/root observer and arbitrary child-Message observer                                                          | Explicit child OutMessages remain the reporting boundary. No generic `afterUpdate` or Binding observer.                                                                                                                                                                       |
| foldkit-plus parent-dependent child Subscription context                                                                                  | Child state/operations and Subscription gating remain available; no generic Binding `toContext` projection/restart contract.                                                                                                                                                  |
| foldkit-plus lazy Blocks, [#1799](https://github.com/foldkit/foldkit/pull/1799) / [#1559](https://github.com/foldkit/foldkit/issues/1559) | Loading handlers with `import()` does not supply lazy child graphs. #1799 targets the stable Runtime API, adds a substantial activation/lifecycle design and explicitly says adoption may wait until v1. It is not already compatible with or adopted into checked Blocks.    |
| foldkit-plus leaf shorthand / completed transformations                                                                                   | Existing checked boundary applies to leaves. The approved customization guide documents factories, alternate embedded views, inputs, child attributes, handler replacement and wrapper Blocks. No arbitrary `rename`/`mapUpdate` API.                                         |
| foldkit-plus multiple Mounts on an element                                                                                                | Second `OnMount` now throws before acquisition. First-class multiple-Mount lifecycle composition remains a different design request.                                                                                                                                          |
| #1785 LiveQuery / #1800 AgentContext                                                                                                      | New general data/agent APIs, excluded from Blocks/Layers stabilization.                                                                                                                                                                                                       |

The foldkit-plus scope is the previously recorded assessment plus the user's
approval of its two small wins. A future proposal may be worth adopting without
being a requirement for this stabilization preview.

### Dynamic plugin question: supported answer

For code whose types are unknown to the host until `import()` runs, a separate
element-scoped Program and host-owned `Runtime.embed` lifetime is a coherent
existing boundary. Its Schema-typed Flags and Ports define the host/plugin
contract. It does not insert an unknown child into an already checked static
Composition.

The [Runtime guide](../packages/website/src/page/core/runtime.md) and
[Embedding guide](../packages/website/src/page/core/embedding.md) are explicit:
the host gets Ports and `dispose`, not direct Model access or arbitrary dispatch.
To replace code, the plugin must deliberately export any resumable domain state
through its public protocol; the replacement validates/version-migrates that
state through its own Flags/init contract. Dispose the old handle before
embedding the replacement. This is a new Runtime lifetime with normal teardown,
not a seamless code swap preserving all pending work, DOM state or occurrences.

Do not recommend reading the old live Model from the handle: that API does not
exist. Do not promise that blindly passing an old Model to new code is safe.
`src/runtime/applicationElement.test.ts` and `applicationLayer.test.ts` cover
provided Services and disposal/container lifetime; they do not certify a generic
hot-plugin replacement system. This assessment answers the boundary question
without adding an unreviewed plugin framework. A concise public response remains
available for the maintainer to post separately.

## Implemented release work that remains publicly open

- **#1704, #1707, #1708:** Animation leave-settlement operation and focused owned
  Step family are implemented. The latest callback-only producer and record-only
  update migrations are already in published `f3be22cfeefe`.
- **#1706:** Record/HashMap adapters shipped. The next candidate moves the helper
  onto `Definition.makeMapBinding`, removes the standalone spelling and retains
  detached owner-helper inference. [Current adoption](map-binding-method-adoption-20261027.md).
- **#1678:** Composition child initialization and the set/append/insert helper
  family are implemented. The latest conditional mapped-child helper is
  `makeInitIfMissingStep`; current source and
  `declaration-tests/insert-initialization.*.ts` preserve accepted/rejected
  contracts. Its source is `src/block/mapInitialization.ts` and runtime suite
  `insertInitialization.test.ts`.
- **#1726:** native Date, nested records/collections and connected-Step diagnostic
  repairs are implemented; later Effect DateTime addendum is also covered above.
- **#1759:** `managedResources.layer` is implemented. The issue body's old
  "deferred" scheduling paragraph is stale and must not drive a new deferral.
- **#1760:** test-only headless `toParentMessage` is implemented; its old
  "no new helper" scheduling paragraph is also stale.
- **#1767:** Workspace and representative static scale workloads are present;
  the current app-only commit has 154 passing tests plus source/lint/build and
  independent review recorded separately. This is not a new framework gate.
- **#1772/#1779:** reciprocal-policy closure and checker-order fixes are present;
  final integrated regression runs remain release gates.

These items need accurate public closeout/bookkeeping when the replacement
snapshot is verified. This read-only task did not close issues or update posts.

## Screened exclusions and final actions

The recent sweep also found #1803–#1809 UI/DevTools/example-tooling work,
#1782/#1775 color scheme, #1784 pre-hydration input, #1774/#1771 stable paint
queue work, #1786–#1798 general testing/UI/Runtime additions, #1778 DevTools
correlation, #1722/#1723 general UI requests, #1727 Query and older unrelated
hydration/lint/AsyncData tasks. Existing task-board exclusions distinguish these
from the Blocks/Layers preview. Their correctness or merge readiness has not
been certified here.

Before publishing another preview:

1. Freeze the combined source and refresh the relevant verification/review gates.
2. Present the known limitations and nonadopted proposals accurately; do not say
   that all repository issues or every requested API is resolved.
3. Prepare current migration instructions for `Definition.makeMapBinding` and
   mapped-child conditional initialization; historical published material stays
   pinned to its original APIs.
4. When approved and verified, update release-specific issue bookkeeping and
   #1655's replacement snapshot together. Preserve its three starting points and
   the already published Ready snapshot until then.

No GitHub mutation, comment, commit, push, merge, deployment or publication was
performed by this reconciliation.
