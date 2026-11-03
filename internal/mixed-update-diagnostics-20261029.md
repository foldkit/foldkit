# Mixed update result diagnostics | October 29, 2026

## Change

An update handler that mixes a raw local result with a connected recipe now
reports its repair on the handler value. The previous diagnostic expanded
intersections of the result types before reaching the repair text.

The check recommends `Definition.makeStep` or a focused Step helper for local
branches. It also covers visible mixtures with Definition-owned Step results.
Raw-only handlers and compatible Steps remain supported. The inference map,
`NoInfer` validation inputs, per-Message outputs, erased-channel checks and
registration checks retain their contracts. Runtime implementation is unchanged.

The ordinary error still prints the contextual handler signature. A
`.withContext` error can begin at the factory argument before naming the
offending handler. This change does not promise a precise branch highlight or
shorten every Composition diagnostic.

## Verification

Three intentionally invalid consumers cover an inline connected branch, a
contextual handler and an extracted connected handler with its precise
operation-derived input. Each must produce one error with the repair attached
directly to the function. The checks use default diagnostic truncation, in
source and relocated published declarations. Paired accepted consumers apply
`makeNoopStep` or `makeStep` in their local branches and retain an ordinary
raw-only handler beside them.

Existing source and external declaration fixtures cover exact Model/Message
inference, Commands, Services, OutMessages, constructor errors, registration,
generic consumers, direct Steps, and optional/default/rest dispatch context.
All 53 workspace package typechecks and 16 focused runtime tests pass.

The independent position control preserves the new wording but moves the
validation back into the return type. All three consumers remain rejected,
while their direct-handler diagnostic assertions fail. This verifies the
diagnostic placement rather than only matching a new error string.

All seven unchanged compiler ceilings pass after rebuilding the public
declarations. The largest eight-group fixture adds 896 instantiations
(approximately 0.02%) and removes 136 Types; the Subscription and Machine
counters are unchanged. This is a compiler-cost check, not a new editor-latency
or rendering benchmark.

Evidence is retained under
`/private/tmp/foldkit-preview-feedback-20261029-1421`, prefixed
`mixed-diagnostics-`. The preliminary performance log used preceding built
declarations; only `mixed-diagnostics-performance-built.log` measures this
change. The first declaration run failed because a proposed invalid fixture
had already lost its local Step shape. The final run passes with the corrected
connected-handler fixture, including both core and UI declaration gates.

## Visible-type boundary

An extracted helper that mixes a local noop Step with `{ model }` can have its
union simplified to the raw shape before `makeUpdate` receives it. That is
the existing upstream width-erasure limit. The diagnostic does not reconstruct
erased branches or introduce a new rejection guarantee. The rejected extracted
fixture retains a visible connected recipe instead.

## Release boundary

Active Update and preview-upgrade guidance describe the new diagnostic and
retain their paired repair snippets. Historical feedback assessments retain
their original checkpoints. The separate unrecoverable prerelease-lockfile
report remains unreproduced without the original manifests, lockfile and npm
version. No speculative lockfile repair is implemented here.

This follow-up does not publish a release or change the published Ready snapshot.
