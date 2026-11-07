# Preview follow-up feedback

This work follows the frozen explicit Binding adoption commit
`3d3eb8998eeced834d4a7fa1810f72179796a3c3` in #1903. It is not covered by that
commit's verification or security approval. Daybreak and publication remain held.
The [task board](next-preview-tasks.md#november-6-follow-up-feedback) tracks the
remaining checks and release preparation.

## Startup contracts and child acquisition

The positional initializer contract is now `InitArgs` throughout the public
surface. The initializer itself remains `init`, authored with `makeInit`.
There is no `Init` compatibility alias. Erased declarations missing `InitArgs`
receive a passive configuration diagnostic; construction does not execute a
Codec or initialize a Model to check the contract.

`Composition.acquireChildren()` acquires the registered Bindings in declaration
order and returns their exact readonly connection tuple. Requirements, errors,
registration identities and construction Scope are preserved. Empty Compositions
return an empty tuple. Partial construction failure releases earlier acquired
children. Acquisition does not initialize child Models, evaluate deferred init
arguments, construct effect handlers or start occurrence lifecycles.

Constructors that only collect children now use the helper across applications,
UI implementations, focused UI fixtures and active snippets. Individual yields
remain appropriate when construction actually uses the acquired handles, such as
the UI factory cleanup-order test. Childless constructors retain `children: []`.

Keyed-array startup may omit `toItem` when the array stores the exact child
Models. Wrapped entries still require an explicit projection. Both forms pass
through the same storage, key and initialization validators. The direct-storage
overload preserves contextual inference without relaxing custom-reader/writer
rejection, deferred arguments or child init Commands.

## IssueDetail context

The old `IssueDetailsBinding.delivery.toUpdateContext` asserted that the parent
still held the canonical Issue before delivering any child Message. Its current
normal-flow invariant was sound:

- A routed editor is initialized only after the Issue lookup succeeds.
- Editors remain stored by Issue ID when navigation hides them.
- The repository has no delete-Issue operation.
- Successful refresh merges retain existing Issues, and failed revalidation
  retains the last successful Workspace through AsyncData.
- Mutation results replace fields or merge comments; they do not erase the
  canonical Issue collection.

That invariant did not justify coupling every Message to the lookup. Text edits,
close, failed saves and comment completion do not require the current Issue.
Clean-draft refresh, conflict-aware saving and discard/reload do. A successful
save already supplies its own confirmed revision, but must prefer a newer parent
revision when one exists.

The smallest change is an `Option<Issue>` dispatch and InMessage context. The
Binding returns the existing optional lookup. Each transition handles the data
it actually needs:

- Clean-draft refresh runs only when current canonical data exists.
- Editing and closing continue independently.
- A new save, reload or discard without an Issue preserves the draft and reports
  its unavailability through the existing failure state.
- Current save completions settle from their actual result or error. Successful
  completion uses the returned revision when the parent snapshot is absent;
  this does not fabricate an Issue or duplicate canonical state.
- Existing identity/version admission still rejects stale save completions.

There is no duplicate lookup in `delivery.when`, no blanket Message drop, and no
new lifecycle or state-machine framework API. The child retains its baseline and
draft; the parent retains canonical Issues. Root rendering continues to handle a
missing URL entity explicitly. Existing current-flow tests retain the real
pending Commands. Additional child Stories deliberately supply absent context to
verify this boundary without inventing a currently reachable deletion workflow.

Focused Workspace verification passed 91 tests across root Story/Scene,
IssueDetail Story/Scene and repository tests. Restoring a mandatory context
assertion made all four new absence scenarios fail; the original source was
restored afterward. The receipt is
`/private/tmp/foldkit-issue-context-mutation-20261106.log`.

## Other unchecked assumptions

All application `delivery.toUpdateContext` declarations were inspected. Typing
Game derives a room ID from its registered keyed occurrence. Website examples
read declared parent fields or derive a Boolean. None repeats the Issue lookup
assertion.

Workspace placement already knew the destination position, but the repository
looked up the newly placed Issue again with `getOrThrow`. Placement now returns
the updated collection and its actual normalized index together. Existing
repository tests cover moves up/down and an out-of-range append; optimistic and
confirmed callers consume the same placement result.

Necessary assertions remain explicit:

- Website blog loading rejects missing or malformed source frontmatter at the
  build boundary with a specific diagnostic.
- Typing Game rejects missing required server configuration at its Service
  construction boundary.
- VirtualList demo data cycles through compile-time nonempty seed collections
  using indices generated by the demo itself. These are immutable fixture
  assertions. The collections now carry that nonempty contract and share one
  typed cycle operation; constant-time selection is preserved.
- Tests may assert that a named, known fixture exists.

An AST inventory found no non-null assertions in active app implementation code.
Literal `as const` expressions are narrowing immutable constants rather than
asserting entity presence. The remaining substantive bridges are the recursive
TypeDoc Schema declarations and Monaco's incomplete ModuleResolutionKind enum.
TypeDoc input still passes through Schema decoding in its Command; the Monaco
bridge targets Bundler resolution supported by its bundled compiler but omitted
from its public enum. Neither is a bypass for missing application data.

## Resource readiness

For #1904, the installed Effect Socket API already supplies readiness, ongoing
message handling, open timeout and scoped cleanup. Acquiring its reader opens the
transport and waits for readiness. Creating the Socket adapter alone does not.

The chat example keeps its existing ManagedResource, Subscription and Commands.
A small local acquisition function captures the injected WebSocket constructor,
acquires the Effect reader/writer and returns the ready connection. The
Subscription reads that connection, and the send Command uses its writer. This
removes manual setup and ongoing listener bookkeeping without adding a Foldkit
public event-waiting API or changing lifecycle ownership.

All 26 chat tests passed, including six controlled socket acquisition cases:
opening, competing failure/open, timeout, interruption, already open and already
closed. Temporarily disabling transport close made all six acquisition cases
fail, including timeout and interruption cleanup. The receipt is
`/private/tmp/foldkit-websocket-cleanup-mutation-20261106.log`.

## Declarative testing

`Command.expectExact` remains order-independent. The new
`Command.expectExactInOrder` uses the same original-identity, argument and scoped
occurrence matcher and also requires positional agreement and an exact count.
Website's three startup order assertions now use the helper instead of typed
simulation callbacks and `Array.zip` loops. Active guidance no longer teaches
simulation inspection for ordinary argument assertions.

Nested `Story.messageIn` accepts a nonempty Binding path. Static segments are
Bindings; keyed segments are `{ binding, key }`. The selected acquired graph
validates the chain and constructs the envelopes. Job Application's root resume
drop test exercises the actual Attachments-to-FileDrop path. Its fixture Effects
are acquired explicitly through ordinary `it.effect`, and forwarding-only Story
wrappers are removed across applications.

Source tests cover both TypeScript 7 and TypeScript 6. Deleting an outer routing
envelope made three path runtime cases fail. Disabling positional matching made
the reordered-Command case fail. The restored focused Core suite passed seven
tests. The later combined Core selection passed 90 tests, including bulk
acquisition and ordinary Story regressions. Source contracts pass TypeScript 6
and 7; the final emitted, relocated and actual Counters application declaration
gate also passes.

Search's fixture-only `withBlock` calls now explicitly acquire an immutable
initial-Model Effect and use the ordinary Block-aware Story runner. Single
SnippetDisclosure views use the runner's `viewInputs` configuration. Their 14
focused Story/Scene tests pass.

Deliberate low-level cases remain:

- SnippetDisclosure's shared-group Scene composes two acquired views over the
  same Model, rather than exercising the Block's single default view.
- Typing Game compares a retained room with another room's initial Model while
  its startup Commands are still pending. API Cache similarly creates an
  intentional loading-state fixture without inventing a pending fetch.
- Playground preview inspects a VNode key to verify iframe identity. That
  renderer-identity assertion has no equivalent DOM attribute expectation.
- Framework routing, lifecycle, compiler and host tests retain the lower-level
  APIs that are their actual subjects.

## Test-server startup

The first #1903 merge group failed when another listener claimed the ephemeral
port between Vite's probe and its actual bind. The installed Vite 8.3.5 source
confirms that its `port: 0` path releases the probe before binding and does not
retry that collision.

The follow-up gives ephemeral test-server startup three attempts for that exact
Vite diagnostic. Configured-port tests and unrelated startup failures are not
retried. This changes test fixtures only. The focused helper and relay selection
passes 38 tests with three existing skips. Disabling retries makes the collision
regression fail; the original source was restored afterward.

## Verification and release scope

All eight existing compiler workloads pass without changes to their fixture
graphs or budgets. The four-group Workspace workload measures 1,608,927
instantiations and 117,788 types; eight groups measure 2,786,731 and 160,805.
Both are below the already approved ceilings. The other six workload counters
are unchanged. The final receipt is
`/private/tmp/foldkit-followup-compiler-performance-20261106-verified.log`.

Public-package rebuilds, declaration consumers, focused application checks,
installed packed SSR consumers in three browsers and the generated-app smoke
test pass. The [verification receipts](preview-followup-20261106/verification/README.md)
retain their scope separately from the final normal pre-push gate and protected
integration requirements.

The [fresh rendering capture](preview-followup-20261106/rendering/README.md)
retains all 64 samples across two batches, raw receipts and analyzer controls.
The optimized preview is slower in all 16 paired rounds, with medians of
216.7/284.6 ms and 180.7/254.6 ms. Host load, reported free memory and sample
ranges limit both batch percentages (+31.33% and +40.90%). Added gzip costs are
47,884/48,511 bytes. Neither remaining cost has user acceptance.

The implementation commit `29b3f80e4048996e43f3d3b1262870a96c3b005b` passes
independent review. It rebases onto protected integration `4a196d9f05` as
`5184951f81` with an identical tree. No final integrated release candidate has been sent to
Daybreak for this follow-up.

The fresh GitHub check found no newer #1655 discussion reply and no inline review
threads. #1904 is addressed through the existing Effect Socket API. The
application-test cleanup and public Story improvements also address the
motivating cases in #1905; that issue's broader framework-wide audit is not
claimed complete by this application pass. The stable crash-view report #1902
and nonempty tagged-union proposal #1900 are tracked separately and were not
added to this Blocks/Layers follow-up.

Historical release posts and accurately labelled migration-before examples
remain unchanged. Shared folds, substantial folds and the reciprocal Job
Application date-picker folds remain extracted. Inlining the reciprocal folds
produced an inference cycle, so their existing deferred boundary is retained.

Publication remains held. The final normal pre-push gate, exact-commit review,
protected integration and a newly authorized security review must precede
release approval. Rendering/bundle review remains separate. Only #1662 and
#1663 have the user's explicit post-main deferral.
