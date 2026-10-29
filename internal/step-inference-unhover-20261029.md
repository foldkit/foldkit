# Step inference and Scene unhover follow-up

## Approved scope

The user approved Model-aware general `makeStep` Message inference and
`Scene.unhover` for this preview. The user explicitly deferred #1662 (typed
OutMessage propagation) and #1663 (derived/default view slots and stronger
collision validation) until after Blocks + Effect Layers merges to main.
Existing explicit forwarding and stable slot identities remain the contract.

This follow-up starts at `501dff944fec205ab6dfe958cec8dc6fd76fd433`.
That parent's production source is the reviewed `564adb49e9` candidate; later
parent commits contain internal evidence only. The prior Daybreak and packed
rehearsal retain their exact source pins. Publication remains held.

## Consumer API and implementation

An inline Model-aware `makeStep` producer receives its entry's exact Model and
Message in both ordinary and `.withContext` update records. Extracted producers
and standalone operation arguments keep precise parameter contracts. No new
callable overload, runtime field, effect phase or consumer annotation is added.

The [complete Editor consumer](../packages/website/src/snippet/blockMessageStepProducers.ts)
shows `SubmittedTitle` composing field and Command Steps from inferred Model and
Message inputs. The [split-file public fixture](../packages/foldkit/declaration-tests/message-steps.accepted.ts)
imports Definition-owned helpers and verifies generic factories, contextual
records, connected operations and checked completed Blocks. The repository
adoption scan found no redundant inline Message annotation to remove: the
Website's URL handler and history handler are extracted Steps, while other
annotations describe real operation arguments. Their contracts are retained.

The general Step's output remains protected by the complete `NoInfer` boundary.
An optional function-valued `__blockStepContext` type property exposes only
argument inference. It is conditional on required Context, so unary Steps keep
their previous visible type. There is no corresponding runtime property.
A named `AuthoredMessageForTag` alias shares the handler and inference hint's
exact Message extraction. Result validation, channels, registration evidence
and requirements retain their existing checks.

This metadata can appear in a Step hover or structural type inspection. A
private unique-symbol prototype failed consumer declaration emission with
TS4023; the string metadata avoids that unnameable symbol. Moving `NoInfer`
into individual result slots lost registration precision and a channel-loss
rejection, so that encoding was rejected. A simpler unconditional hint passed
source and compiler checks, but was not selected because it adds metadata to
unary Steps. Failed controls remain in the raw evidence.

Whole-update utilities and curried updates retain their aggregate contracts.
Completed operations preserve the selected handler's channels. The new source
and relocated fixtures assert exact contextual Command requirements, OutMessages,
silent operation requirements and connected registration evidence at the
appropriate boundary. Explicitly annotating a general producer's Model as
`any` remains a preexisting TypeScript escape hatch; this change does not claim
to reject it. Inferred inputs are checked for exact types.

## Scene interaction

`Scene.unhover(target)` invokes the selected element's `mouseleave` handler,
falls back to `mouseout`, and uses the existing scoped capture/update pipeline.
When both handlers exist, `mouseleave` wins. Missing targets and missing
handlers retain Scene diagnostics. This is one declared handler invocation,
matching `hover`; it does not add a full browser pointer-event sequence.

The implementation adapts Tanner Scadden's contribution
[PR #1823](https://github.com/foldkit/foldkit/pull/1823), head
`b47bb3e037c76e5f5c7cce20da3fdad27039e9fc`. The public PR remains unmerged;
no external state was changed. The Scene guide, both API snippets and the public
source/emitted fixture use the new function. No existing first-party consumer
Scene used hover, so there was no matching consumer interaction to migrate.

## Verification

- Core source checks pass, including exact inferred Model/Message assertions.
- Full TS7 external emission, rejected wiring, physical declaration relocation,
  compiler diagnostics, native completion and inferred documentation pass.
- Fresh focused public fixtures pass in source and relocated emitted consumers
  for both inference and Scene usage. Contextual and ordinary channel assertions
  are paired with wrong-tag, erased/narrowed Message, invalid result, missing
  handler and missing-registration rejections.
- TS6 source checking and consumption of TS7-emitted declarations pass. TS6's
  own emission of the preexisting destructured focused-helper fixture fails
  equally on baseline and candidate because it cannot name two existing private
  helper interfaces. This is not a new regression or a claim that all TS6
  declaration-emission patterns pass.
- Definition Step/record runtime tests: 11 pass. Scene suite: 786 pass.
- Website, Workspace, Typing Game and UI source checks pass.
- Restoring the old inference encoding makes accepted fixtures fail on the
  intended Message contract; restoring the fix passes. Forcing `unhover` to
  always choose `mouseleave` makes the mouseout fallback test fail; the source
  is restored and the full Scene suite passes.
- All seven current compiler ceilings and fixture sources are unchanged.
  The four-group fixture moves from 2,629,192 instantiations / 227,452 types to
  2,633,088 / 228,293. The eight-group fixture moves from 4,371,356 / 299,721 to
  4,256,896 / 277,274. These counters do not establish editor speedups.

## Paired editor comparison

The final delivery encoding uses the same frozen consumer source, third-party
dependencies, TypeScript 7.1.0-beta and unchanged benchmark drivers. Only copied
Foldkit package outputs vary. Three pairs alternate before/after, after/before,
before/after for Website, Workspace and the retained 16-group/16-map fixture.
All expected hovers, completion members and diagnostic transitions validate;
workload hashes remain stable within each variant. Owned builds and tests are
idle during timings. Other ordinary editor services remain active, so the
wall-clock measurements retain that environmental limitation.

Median milliseconds:

| Operation                                  | Before |  After |
| ------------------------------------------ | -----: | -----: |
| Website post-edit Binding completion       |  295.1 |  304.7 |
| Website error appearance                   |  705.5 |  733.8 |
| Website error clearing                     |  721.7 |  705.2 |
| Website cold completed-Message diagnostics | 3613.1 | 3698.9 |
| Workspace post-edit Binding hover          |  296.2 |  303.0 |
| Workspace post-edit Binding completion     |  296.9 |  308.2 |
| Workspace post-edit Block completion       |   66.8 |   76.0 |
| Workspace error appearance                 |  220.6 |  219.2 |
| Workspace error clearing                   |  220.2 |  200.9 |
| 16-group post-edit Block completion        |   54.2 |   26.0 |
| 16-group error appearance                  | 2044.4 | 1968.4 |
| 16-group error clearing                    | 1886.8 | 1851.4 |

Workspace's sampled peak RSS ranges are 421–441 MiB before and 422–452 MiB
after. The larger fixture ranges are 671–677 MiB before and 658–692 MiB after.
The Website driver does not sample memory. These are bounded sessions, not a
long-session memory guarantee or a universal application-size result.

The final results are mixed and practically comparable. Cold Website completed
Message diagnostics remain about 3.6–3.7 seconds. An additional three cold-only
pairs measure 3,627.0 ms before and 3,614.4 ms after, with substantial variance.
An earlier hint-only control had slower outliers; retain it rather than pooling
batches or claiming that alias caching alone caused an improvement. No material
new editor regression is established by the final bounded screen, and no
statistical equivalence or general speedup is claimed.

Browser-facing production JavaScript is unchanged. The only changed JavaScript
files in the package are Scene and its interaction fixture. No new Lustre run
is needed for these changes, and no rendering improvement is attributed to them.
The earlier rendering gap and compiler-scale limits remain explicit.

## Review, release hold and evidence

Independent prototype and consumer/prose reviews found no blocker. The exact
committed-diff review is recorded separately before any push or release.
Current changesets cover Foldkit and scaffold guidance. Active Block/update
pages, the preview upgrade guide, scaffold conventions and consumer skills are
updated; published historical material is preserved.

The broader Daybreak PASS applies to `564adb49e9`. A separately approved
addendum now returns PASS for exact follow-up `d35d3ceb7a`, with all 7,191
source hashes preserved. All nine packages rebuild and pack successfully, and
their artifact hashes pass. [Final review, package scope and receipts](preview-followup-final-20261029.md).
No package upload, integration push, deployment, PR Ready promotion or actual
Coverchart update was performed. The verified published snapshot stays
`f3be22cfeefed437164ad614d08b16d9000e0703`.

The [measurement and source receipt](step-inference-unhover-20261029.json)
contains exact file hashes, samples, compiler counters and verification scope.
Raw logs, failed controls, mutation logs and review reports are at
`/private/tmp/foldkit-step-inference-unhover-20261029`.
