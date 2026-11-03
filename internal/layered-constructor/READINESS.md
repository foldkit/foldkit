# Repository migration readiness

## Recommendation

The [current stabilization report](STABILIZATION.md) records the reviewed
construction migration, dependency repairs, three new feedback fixes, combined
verification and remaining release decisions. All 22 integration groups pass
for the feedback-fix source, including 4,030 core, 1,354 UI and 1,527 Website
tests. The separate application matrix passes 720 tests. Exact-commit review
approves `db69206779`, and strict packed SSR/Chromium consumers pass.

The #1868 post-update hook is unimplemented: its prototype fails the required
inline inference and further work awaits explicit approval. Fresh Daybreak
transfer is also awaiting authorization. The two remaining moderate tooling
advisories and measured bundle/runtime costs require review. These are open
gates, not approved deferrals. No publication is approved.

The independent contract and Layer construction proof passed its application
and generic-library checks. Repository adoption is now implemented across the
catalogued production consumers. Construction migration verification is
complete, including all 22 final integration groups, complete declarations for
three real applications, strict packed SSR consumers, and the unchanged compiler
budgets. The separate [InMessage report](inmessages/README.md) records the
subsequent input API, adoption scope, lint follow-through, and final checks.
This is not release approval.

The [rendering comparison](rendering-final/REPORT.md) found and verified a
builder-identity correction. The final frozen `db69206779` batch measures the
whole preview branch 21.6% slower in the naive workload and 25.8% slower in the
optimized workload than actual main. The bundle adds about 40 KB gzip. These
remain review items; that comparison does not isolate the new constructor's
cost. The separate preceding-preview/e6 comparison measures +1.7% naive and
−4.4% optimized, with about 7.9 KB more gzip.

The earlier source commit, `fd4f03253faa782eaa7f45d043127e3bf21ad572`, passed
independent review after the exact-Definition, family input-validation and
constructor snapshot corrections. Full and affected follow-through checks are
recorded separately in the adoption report. The stabilization report above
records later dependency repairs and review status without changing this
earlier checkpoint's scope.

See [adoption status](ADOPTION.md) for the current checks and remaining work.
Earlier sections below explain the architectural proofs that justified moving
beyond the isolated ChatRoom and Domains experiments.

All work remains in the isolated clone at
`/private/tmp/foldkit-incremental-constructor-20261031`, on
`codex/incremental-constructor-spike`. The shared checkout and its concurrent
DOM edits remain untouched. No release was published.

## What passed

### Construction and portable authorship

The constructor-authored Message Composer is supplied through an ordinary
Layer. Its parent imports the independent contract and retains extracted
Binding operations, OutMessage policies, init, update, and graph-aware view
builders. The complete expressions remain usable inline, constructor-local,
and in separate modules.

The public Program now also runs a parent containing two direct Rooms and a
Record-keyed Room. Each occurrence sends and receives through its own socket.
Removing and recreating the keyed Room releases its old socket and listeners
while the other Rooms remain connected. Disposal releases all remaining
occurrences. See [roomCollection.ts](contract-provisioning/src/roomCollection.ts)
and [runtime.test.ts](contract-provisioning/test/runtime.test.ts).

### Execution requirements and lifetimes

The Runtime installs an authenticated execution capability beside each
occurrence's actual resource refs. The public contract no longer needs a list
of private descendant resource identities. Completion still checks the native
graph before closing only resources guaranteed by that graph.

Handler Layers build with ordinary Services before any Runtime occurrence
exists. Returned Commands resolve their occurrence capability at invocation,
restore the invocation phase, and execute within that occurrence's Scope.
Wrong occurrences, retired occurrences, wrong implementations, and closed
construction acquisitions reject execution.

The capability is a public execution bound. Calling init, update, or an
operation stays pure and synchronous after graph acquisition. The bound does
not claim that every operation uses a resource.

The [reproducible resource proof](runtime-capability/README.md) covers real
resources, shared handler memoization, constructor versus handler Services,
typed handler failure, source and relocated declarations, and deliberate
failure controls. It supplements the public Program checks.

### Inputs, operations, and empty dispatch

Nonserialized input contracts retain callback-rich generic view, init, and
Context inputs. Operation declarations accept direct Message constructors and
existing tuple producers, including positional, defaulted, and contextual
arguments. Invalid payloads and callbacks reject in source and relocated
declarations.

A genuinely message-free contract opts into `isMessageFree: true` with a Never
Message Schema. Completion checks the full dispatch Schema, including children.
It uses `makeUpdate({})` without an invented Message. Routed-only parents keep
their actual generated delivery. The [silent fixture](contract-provisioning-proof/src/message-free.ts)
and [tests](contract-provisioning-proof/test/message-free.test.ts) cover both
source precision and erased callers.

Routed-only children receive Context through their Binding delivery policy.
Nonempty parent dispatch Context is an existing native and hybrid limitation
for the empty-local update form; it is not automatically forwarded to children.

The silent case exposed an extraction defect: built-in `ReturnType` inferred
`any` for the update with a Never Message parameter. The projection now uses
the native framework's safe return extraction pattern and retains exact empty
output and requirement channels.

### Declaration identity

Readable names no longer serve as process-global contract identities. An
exported unique Symbol distinguishes declarations, and its identity reaches
both provider facts and authoring Owners. Two roots named `Application` can
coexist without admitting each other's providers, plans, or Bindings.

The Symbol must be exported from its Definition module so inferred split-file
declarations can name it. Consuming modules still import the Definition or
Contract. This is an additional authoring requirement compared with the shared
API sketch.

The Owner brand projects only that key. It does not repeat the complete
configuration each time an emitted contract names its Owner.

Runtime capability keys follow the canonical Owner object, so equal display
names cannot overwrite each other's authority. Child-owned capability
requirements also retain their Binding path through OutMessage policies.

Constructor bodies omit the operation inventory because the Definition declares
it. Source validation rejects that key in required, optional, and union bodies;
erased callers also reject at acquisition.

## Library authoring

### Generic factories

The [genuine Choice proof](generic-identity/README.md) uses a Schema-specialized,
constructor-authored child through an independent contract and one shared
implementation Layer. Its parent has deferred init, an extracted child
operation, an exhaustive OutMessage policy, and callback-rich rendering.
Source, emitted, relocated, and runtime checks pass in that separate copied
framework experiment.

The application code stays compact. The library implementation adds a
higher-rank constructor interface, a family provider, and an opaque recipe
resolver. The original Choice experiment remains preserved separately. Its
family mechanism is now integrated into the canonical spike and exercised by
the [Query proof](query-contract/README.md).

Type-only specializations such as Listbox can use one canonical parametric
implementation with a library-owned refinement boundary. Runtime
specializations such as Combobox and Query need their Schema/config values
when constructing an implementation. These cases need different mechanisms
inside the library; application usage should remain ordinary typed builders.

### Generic Query Services and failures

`QueryToLayer` and KeyedQuery accept arbitrary invocation requirements,
constructor requirements, and constructor errors. Their public types retain
those channels. See `experimental/query/query.ts`, `keyedQuery.ts`, and
`define.ts` in the framework package.

The checked family recipe validates the transition implementation against its
original Fetch declaration. A host-owned descriptor retains that handler as a
public execution requirement. Selecting its handler Layer creates a registered
descriptor with the actual constructor error and Service channels. The handler
constructor still runs during Runtime handler assembly, not graph acquisition.

`makeEffectsContract` also expresses nonserialized channels that have no Schema
or runtime key values. It declares bounds; acquisition still rejects erased
channels and completion checks the implementation.

The proposed `Query.define` covers keyed and unkeyed, host-owned and attached,
default/silent and notifying modes. Factories return descriptors directly, with
the original Fetch and helper identities. Canonical direct `run` uses the
declared `EffectsLayer`; a host-owned declaration supplies its original Fetch
through `toLayer` and `provideHandlers`. Alternative handlers use that host
selection path rather than `replaceEffectsLayer`.

Direct scoped Stories accept contracts with ordinary implementation-Layer
provision. Scenes accept view-bearing families. Exported test Effects retain
their exact error and Service channels without serializing the entire inferred
descriptor. These paths have source, emitted, relocated, runtime and deliberately
failing checks in the [Query proof](query-contract/README.md).

## Adoption checks

Generic UI, Query/KeyedQuery, Workspace, Job Application, the other examples,
Website, Typing Game, DevTools, and scaffold source now use the selected API.
The adoption includes their Story and Scene consumers, canonical guidance,
lint recognition, and active documentation. Published release content stays
historical. See [adoption status](ADOPTION.md) for verification results and the
remaining review gates. The subsequent [InMessage work](inmessages/README.md)
records its own adoption and final checks.

## Verification

Run the integrated current-package checks with Node 22:

```sh
node internal/layered-constructor/verify-adoption.mjs
```

The adoption verifier uses canonical package entry points for the current
source, full Framework and UI suites, public emitted and relocated consumers,
deliberately failing controls, application source checks, Website tests, and
the seven unchanged compiler budgets. Results are written under
`adoption-checks/verification/`, with `latest-final.json` identifying the run.

The earlier `verify.mjs` belongs to the research stage. Its historical fixtures
use unpublished research entry points that are absent from the selected public
API. Keep its recorded results separate from current-package adoption evidence.

The integrated runner records its selected checks, including the seven compiler
budgets with their original fixtures and limits. The linked result records that
run's scope and status; an earlier passing prototype run does not establish that
the later migration passed. Source and relocated rejection controls deliberately
remove the corresponding validation.

The generic-family investigation also has copied-package verifiers and artifact
hashes. Its green result is evidence for that prototype. Current adoption has
its separate complete integration receipt, `final-JZp0oY`. No new editor-latency
claim is made. Final rendering measurements are reported separately.
