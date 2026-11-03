# Repository adoption

## Status

Production consumers now use independent Block contracts, portable Definition
and Composition builders, and Layer-based implementation construction. The
work remains isolated on `codex/incremental-constructor-spike` at
`/private/tmp/foldkit-incremental-constructor-20261031`. The shared checkout's
concurrent changes are untouched. No release has been published.

Production adoption and the integrated public consumer checks are complete.
Website view input contracts now live independently of their implementations;
the unchanged dependency-cycle check, source checks, focused tests, production
build and prerender pass. Earlier prototype verification retains its own scope.
The migration is prepared as one coherent construction and InMessage change.

The subsequent [InMessage phase](inmessages/README.md) adds separate parent
inputs and records its own adoption and verification. The receipts below describe
the construction migration before that phase; they are not substituted for the
later final checks.

## Final construction and InMessage checks

The subsequent [stabilization report](STABILIZATION.md) records the fresh
dependency and feedback-fix source separately. All 22 integration groups pass
in `final-5z56yM`: 4,030 core tests with one intentional skip, 1,354 UI tests,
and 1,527 Website tests. All seven compiler budgets are unchanged. The complete
application matrix passes 720 tests in `test-LfYpte`, and the default packed
SSR/Chromium gate passes in `security-20261102T193317Z`. The exact feedback-fix
commit `db69206779` passed independent review. The historical checkpoints below
retain their own source pins and counts.

`adoption-checks/verification/final-BSU05S/results.json` records all 22 current
integration groups passing after both independent review fixes. The final suites contain 4,016 passing core tests
with one intentional skip, 1,351 UI tests, and 1,526 Website tests. Source,
emitted and relocated consumers, rejection controls, active snippets, scoped
testing, and all catalogued app source checks pass.

All seven original compiler fixtures and ceilings pass unchanged. Workspace
with eight children uses 4,314,773 instantiations and 280,654 Types; Machine uses
70,759 and 13,405. The exact budget-file hash is recorded by the runner.

Whole-project declaration emission and strict source-free consumers also pass
for Workspace, Job Application, and Website in
`app-declarations/verification/run-ly0B7l`. The expanded Binding proof preserves
union-child policy requirements and includes four failing mutation controls.
Its final receipt is `emission-boundary/binding-parity-mgH366/results.json`.
The descriptor fold proof retains per-case callable contracts in source and
relocated declarations. The view-reflection control now breaks the compact
Binding's actual signature order and detects the intended failure.

The fresh packed check and ten maintenance gates pass; see
[packed verification](packed-adoption/README.md) and the local
`maintenance-j51WzW/final-results.json` receipt. The final scoped formatter ran
on all curated authored files. Rendering measurements and exact-commit review
are separate final gates. The [security review](final-security-review.md)
records outstanding dependency advisories and does not claim a fresh Daybreak
review or release approval.

The rendering check subsequently found a candidate-only builder-identity
regression. The corrected graph keeps one ordinary Html builder adapter per
acquisition, including nested input-bearing views. Three new Scene tests and
two failing controls cover lazy reuse and acquisition isolation. See
[builder reuse](view-composition/BUILDER-REUSE.md).

After that private runtime correction, all 349 built core declaration files are
byte-identical to the full integration checkpoint; only the constructed runtime
JavaScript changed. The six affected source/runtime/view gates passed in
`final-NlEYyc`, including 4,013 core tests, 1,351 UI tests and 1,526 Website
tests. All 35 declared app/Typing Game scripts pass 720 tests, with three
explicit no-script skips. A fresh packed SSR check passes in
`packed-adoption/verification/fresh-20261102T034408Z`. These follow-through
checks retain their earlier scope. The subsequent full `final-BSU05S` run
repeats all 22 groups after exact-Definition completion authentication and
generic-family input validation. The unchanged app test matrix passes again
in `test-eLbwgo` with 720 tests, and fresh packed SSR/types/Chromium consumers
pass in `packed-adoption/verification/fresh-20261102T042258Z`. Whole-project
declarations and their copied contract-erasure controls also pass again in
`run-ly0B7l`; no original application or framework files are read by consumers.

A later review found that completion authenticated `init` before rereading it
from a constructor accessor. Completion now snapshots the constructor body once
and uses that data for authentication, receive compilation and graph completion.
The two added regressions retain deferred initialization and the rejection of
non-enumerable operation declarations. All eight affected build/source/runtime
groups pass in `final-fmawkv`, including 4,018 core tests with one intentional
skip, 1,351 UI tests and 1,526 Website tests. All 499 core/UI declaration files
remain byte-identical to `final-BSU05S`; only the private contracted runtime
JavaScript and its declaration source-position map changed. The unchanged
contract and compiler-budget checks retain their full-run scope above.
Fresh packed SSR/types/Chromium consumers also pass after that correction in
`packed-adoption/verification/fresh-20261102T043504Z`.

The exact source commit `fd4f03253faa782eaa7f45d043127e3bf21ad572` passed
independent review with no remaining findings. The final balanced rendering
batch records the whole preview 14.6% slower for the naive workload and 32.6%
slower for the optimized workload than actual main. The [rendering report](rendering-final/REPORT.md)
retains all three batches and the bounded CPU diagnosis. These measured costs,
the dependency advisories and fresh Daybreak review remain release-review
items, not completed fixes or approved deferrals.

## Selected API

- A module-level Definition declares the unique key, Schemas, inputs,
  operations, view capabilities, and ordinary handler requirements.
- Parents bind `FeatureDefinition.contract`, exported as `FeatureBlock`.
- The constructor passed to `Definition.makeBlock` yields registered Bindings
  and returns those acquired connections as `children` with init, update, view,
  local lifecycle declarations, and `EffectsLayer`.
- A feature exports its implementation `layer`; ordinary Layers supply child
  implementations and construction dependencies. Command Services remain in
  handler constructors. Construction does not initialize Models or start
  occurrence lifecycles.
- Story and Scene own scoped acquisition. Advanced direct transition fixtures
  use `withBlock`; nested test delivery resolves through the actual acquired
  parent graph.

Generic library authors use a checked family for runtime Schema specialization.
`Block.makeFamilyDefinition(originalNamespace, contracts)` shares an existing
owner without adding a costly Schema-heavy member to every Namespace.

## Review starting points

- [Counter](../../examples/counter/src/application.ts) shows the compact root.
- Workspace's [Definition](../../examples/workspace/src/definition.ts),
  [Composition](../../examples/workspace/src/composition.ts), and
  [Block](../../examples/workspace/src/block.ts) show extracted authoring and
  child acquisition in a larger app.
- Workspace's [Story tests](../../examples/workspace/src/story.test.ts) show
  scoped testing and delivery through the acquired graph.

## Verification

The canonical integrated verifier passed all 19 groups configured for
`adoption-checks/verification/final-IGnBKL`. The standard UI emitted-declaration
gate was subsequently added to that runner and passed separately. The Website
contract-file extraction passed the unchanged cycle check, full application
source check, 18 focused tests, lint, production build and 225-page prerender.

The [final maintenance receipts](adoption-checks/verification/final-maintenance/results.json)
record the standard full `lint:ci`, formatting, all 14 package typecheck scripts,
script typechecking, core/UI build, both standard declaration gates, and the
Website rebuild after the final guidance corrections. Generated compiler output
and immutable research captures are excluded from formatting; authored proof
source remains checked.

| Area                                      | Evidence                                                                                                                                                                                                                     |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Example and Typing Game production builds | All 38 passed; [app matrix](adoption-checks/README.md).                                                                                                                                                                      |
| Example and Typing Game tests             | All 35 existing scripts passed, covering 716 tests. Three packages have no test script and are recorded as skipped; [app matrix](adoption-checks/README.md).                                                                 |
| Workspace                                 | All 154 existing tests, source check, production build, and production-browser issue/editor/Board flows; [app matrix](adoption-checks/README.md).                                                                            |
| Job Application                           | All 66 existing tests and full source check pass, including nested FileDrop delivery through the acquired Attachments graph.                                                                                                 |
| Website                                   | All 1,520 existing tests and full application source check pass. Normal production build and Chromium prerender pass, indexing 225 pages.                                                                                    |
| Framework runtime                         | 3,985 tests pass with one intentional skip.                                                                                                                                                                                  |
| Lint plugin                               | Build, source check, and 683 tests pass; [lint audit](adoption-checks/README.md).                                                                                                                                            |
| Generated apps and Vite                   | CSR, SSG, and SSR generation/build checks; 147 Vite build/SSR/HMR tests; nine VirtualList browser cases; [scaffold proof](scaffold-construction/README.md).                                                                  |
| Public UI contracts                       | All 1,349 tests in 68 files and full source check pass. Strict source, declaration emission, relocated consumers, and failing controls are covered by the [UI proof](ui-leaves/README.md).                                   |
| Query families                            | Exact Service, error, handler-selection, and accepted/rejected contracts; [Query proof](query-contract/README.md).                                                                                                           |
| Views                                     | Callable extracted view plans and selected alternate child views with owner/source checks; [view proof](view-composition/README.md).                                                                                         |
| Test delivery                             | Original acquired parent and selected nested child provenance, including rejection controls; [test proof](testing-public/README.md).                                                                                         |
| Actual public app declarations            | Workspace, Job Application, and Website roots emit and pass strict source-free consumers plus a failing precision control; [declaration scope](app-declarations/README.md).                                                  |
| Packed npm consumer                       | A fresh clean seven-package build, strict peers, one physical Effect runtime, inferred Programs, npm workspace execution, SSR and default Chromium hydration/refusal checks pass; [packed scope](packed-adoption/README.md). |
| Active snippets                           | 122 complete roots compile; source/emitted helper consumers and nine behavior tests pass. All 33 historical hashes are preserved; [snippet scope](website-snippets/README.md).                                               |
| Compiler budgets                          | All seven unchanged fixtures and budgets pass. Workspace uses 280,592 Types against a 299,721 limit; the [ownership investigation](emission-boundary/REPORT.md) includes a failing regression control.                       |

These counts identify existing suite results, not distinct shipped bug fixes.

## Final review checklist

- [x] Preserve inline, local, and extracted builder authoring.
- [x] Preserve original Binding, handler, Mount, resource, and occurrence identity.
- [x] Preserve passive construction, deferred init, pure transitions, and cleanup.
- [x] Adopt the API across catalogued production consumers and generated app sources.
- [x] Preserve compiler fixtures and budgets.
- [x] Update canonical app and skill guidance through the repository's existing workflows.
- [x] Complete active snippet verification and confirm historical hashes.
- [x] Complete full UI source and runtime checks, including global contract fixtures.
- [x] Build and render the Website documentation through its normal workflow.
- [x] Finish canonical emitted-declaration and relocated public consumer checks.
- [x] Review the published export surface for leftover research-only entry points.
- [x] Pass every unchanged compiler budget on the final implementation.
- [x] Finish the unchanged dependency-cycle check after extracting Website view input contracts.
- [x] Pass the standard Effect lint gate and repair compile-only rejection probes.
- [x] Remove obsolete preparation guidance from active skills and scaffold instructions.
- [x] Review the integrated diff and record concrete remaining limitations.

The subsequent InMessage work is recorded separately. Publication stays held
for approval.

The independent [construction and testing review](adoption-review/architecture-review.md)
and consumer review covered implementation ownership, scoped tests, public
contracts, and realistic split-file applications. The final lint, formatting,
dead-code, public export, Effect prebundle and dependency-cycle checks pass.
The shared checkout retains its original concurrent changes. This work is not
integrated into that checkout or published.

The final rejection-fixture audit preserved all 61 expected-error comments.
Three context probes had previously failed on missing identifiers; they now
import the real accepted updates. Removing each directive independently fails
on the intended context contract, and restoring it passes. The private Runtime
Effect-channel exceptions follow the existing native dispatcher policy; their
[audit](adoption-review/runtime-erasure-lint.md) explains each erased boundary
and the public checks that remain active.

## Deliberate boundaries

An ordinary independent Block closes its local handler inventory during
completion. A separately authored provider still uses the original definition's
`toLayer` in the implementation's `EffectsLayer`, preserving its identity,
Services, errors, and lazy construction. Host-selected external capabilities
normally use ordinary Services beneath that real handler.

Ordinary descriptors do not expose a pending `hostHandlers` / `provideHandlers`
selection stage. Query and other deliberate family interfaces retain their
checked selection path, and the native API's existing pending-handler path
remains covered. The migration docs distinguish these forms rather than
presenting them as interchangeable.

The implementation modules backing the research remain internal. Five
unpublished research package entry points were removed; applications use
`foldkit/block`, `foldkit/story`, and `foldkit/scene`.

Native assembly and its keyless Definition authoring remain public for advanced
library consumers and unchanged framework controls. Production applications use
independent contracts. The consumer migration does not remove the native API.

API Cache Query deliberately supplies its Query and Tabs construction Layers at
the Program/test root. Other examples close those choices inside `block.ts`.
Both use ordinary Layer composition.

## Complete application declarations

All configured exports now emit for Workspace, Job Application, and Website,
including intermediate Compositions and Plans. The canonical run
`app-declarations/verification/run-FWRQRY` and its strict source-free consumers
pass without application annotations or casts. Completed root headers retain
the same bounded sizes. Precision controls cover the root, Composition, update,
and view exports, with restored passes.

The [declaration report](emission-boundary/REPORT.md) explains the framework's
compact relationship and fold representations, exactness checks, full output
sizes, and earlier failing controls. The fix preserves the native callable and
registration contracts; custom policies retain their original representation.
