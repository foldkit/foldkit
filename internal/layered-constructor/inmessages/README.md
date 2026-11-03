# Separate parent inputs

An optional `InMessage` Schema now declares requests and notifications from a
parent. Local `Message` remains the contract for UI facts, Command results, and
lifecycle observations. Both paths use the same portable Definition helpers,
selected child graph, and pure synchronous transitions.

The work remains isolated in
`/private/tmp/foldkit-incremental-constructor-20261031` on
`codex/incremental-constructor-spike`. It has not been published.

## Canonical input update checkpoint

The current integrated source uses `makeInMessageUpdate` and `inMessageUpdate`
without the earlier names or aliases. Its focused composition, source/emitted
and strict relocation checks are recorded in
[canonical-rename-results.json](canonical-rename-results.json). The
[input composition report](../../inmessage-update-prototype/README.md) covers
shared interpreter semantics, exact result channels and compiler ownership.
The source pins and older aggregate verification counts below retain their
historical scopes; they are not new unified Block/direct Layer evidence.

## API

- Define `InMessage` beside `Model` and `Message`. Its tags are disjoint from
  local Message tags. `RequestedX` generates `Binding.requestX`, and
  `InformedOfX` generates `Binding.informX`. No alias map or `send` namespace
  is needed.
- Author an exhaustive `Composition.makeInMessageUpdate` record and return `inMessageUpdate`
  from `Definition.makeBlock`. Inline, constructor-local, and imported builder
  expressions retain the same inference.
- Share an extracted Step when a local fact and a received request perform the
  same transition. InMessage handling does not synthesize a local Message to enter update.
- Declare sparse `inMessageOutputs` for exact public OutMessage and extra
  Service/resource bounds. Omitted entries are silent. Completion checks each
  handler's inferred channels independently.
- An optional `InMessageContext` tuple belongs to `makeInMessageUpdate.withContext`.
  It remains separate from update's `Context`, including optional, default,
  and rest parameters.
- Acquired `inMessageUpdate(model, input, ...context)` and
  `inMessageUpdate(input)(model, ...context)` retain the selected input's channels.
  Commands still return ordinary local Messages through existing delivery.
- Scoped Story and Scene tests accept `inMessage(input)` causes. The runners
  acquire the selected graph, preserve pending Commands, and clean up the Scope.
  Native raw runners reject unresolved input causes.

An input-only Block can retain `Message: Schema.Never`, `isMessageFree: true`,
and `makeUpdate({})`. Generated inputs do not join the runtime Message Codec.
Ordinary Binding calls neither initialize absent children nor bypass occurrence
identity and cleanup.

## Review the consumer

The [Message Composer](consumer/src/messageComposer/inMessageUpdate.ts) shares its submit
transition with local form submission. Its parent
[ChatRoom](consumer/src/chatRoom/steps.ts) calls the generated clear request from
an extracted successful-send pipeline. The [consumer verifier](consumer/verify.mjs)
preserves the original socket, Mount, Subscription, resource, Program, and test
behavior across inline, local, and extracted placements.

The [adoption audit](adoption-audit.md) enumerates production inputs and deliberate
adapters. Workspace, Job Application, UI Showcase, Routing, Website, Typing Game,
and the plain Dialog, Popover, HoverIntent, and Slider controls are the application and
library checkpoints. Its status distinguishes completed adoption from unchanged
scalar, positional, defaulting, and generic adapters.

## Verification

The standard framework declaration driver includes `inmessages` source,
emission, rejected wiring, and strict source-free relocated consumers. The native
input seam checks input-only handlers, Services, constructor errors,
registration, exact Model types, and legacy tuple-producer inference.

The [runtime mutation verifier](check-runtime-mutations.mjs) removes payload
validation, admits inputs into the local Codec, discards input results, skips
input-plan ownership, and substitutes public Binding wrappers for the
normalized graph. Every control must fail its corresponding runtime assertion;
restoring the source must pass.

Run the integrated current-package gate from the repository root:

```sh
node internal/layered-constructor/verify-adoption.mjs
```

It includes the InMessage consumer and runtime controls, unchanged compiler
fixtures and budgets, existing framework/UI/Website suites, and public consumer
checks. Final run receipts identify the exact selected scope. Earlier baseline
receipts in [ADOPTION.md](../ADOPTION.md) predate this separate phase.

The current integrated run passes all **22 groups** in
[`final-BSU05S`](../adoption-checks/verification/final-BSU05S/results.json),
including 4,016 core tests with one intentional skip, 1,351 UI tests, 1,526
Website tests and all seven unchanged compiler ceilings. This run includes the
subsequent generic-family input-validation and exact-Definition completion
fixes. Fresh whole-app declarations, application scripts and packed consumers
are recorded in [ADOPTION.md](../ADOPTION.md).

The subsequent constructor-body snapshot correction passes its eight affected
groups in `final-fmawkv`, including 4,018 core tests. It leaves all 499 core/UI
declaration files unchanged; the complete contract and compiler gates above
retain their original full-run scope.

An earlier integrated run passed all **22 groups** in
[`final-2TQCQ9`](../adoption-checks/verification/final-2TQCQ9/results.json).
It includes 4,008 passing core tests with one intentional skip, 1,351 UI tests,
1,525 Website tests, all 38 application/package source checks, both standard
declaration drivers, and all seven unchanged compiler fixtures and budgets.
The active snippet gate compiles 127 complete roots and preserves all 33
historical file hashes.

The [final maintenance receipts](verification/maintenance-_asjn9lk/results.json)
record full repository lint and formatting, dead-code and cycle checks, public
exports, script types, changeset validation, the Website production build and
225-page Chromium prerender. They also cover the final compile-only probe
cleanup and 698 passing lint-plugin tests after receive recognition was added.

The InMessage ChatRoom passes source, runtime, inline/local/extracted placement,
and placement/runtime mutation controls in
[`run-sQPmhj`](consumer/verification/run-sQPmhj/results.json). The five separate
runtime mutation controls reject their modified implementations and pass again
after restoration in
[`runtime-637JAd`](verification/runtime-637JAd/results.json).

The additional actual-app declaration check preserves the known scope limit:
completed Workspace, Job Application, and Website roots emit and pass strict
source-free consumption, while emitting every intermediate exported builder
still reaches TS7056. The unchanged failures and root precision control are
recorded in the [application declaration report](../app-declarations/README.md).
Public-root success is not a claim that whole-project emission passes.

## Final review checklist

- [x] Keep parent inputs separate from local Messages and their Runtime Codec.
- [x] Preserve passive construction, deferred producers, Model identity, and
      pure synchronous receive execution.
- [x] Preserve exact per-input channels, graph ownership, registration,
      constructor requirements, Context, and occurrence cleanup.
- [x] Verify inline, local, imported, and exported-helper authorship through
      source and relocated declarations, including rejected combinations.
- [x] Adopt every ordinary application boundary and the four plain UI controls;
      enumerate retained factory adapters explicitly.
- [x] Preserve existing application assertions, active snippet behavior, and
      historical content.
- [x] Extend purity and ownership lint checks to inline and extracted receive
      records without treating public InMessages as private child Messages.
- [x] Preserve all seven compiler fixtures and ceilings without budget changes.

The [remaining factory inventory](adoption-audit.md#intentional-remaining-factory-apis)
contains 26 direct aliases beside 35 scalar, positional, defaulting, or generic
adapters. Their existing APIs remain supported; this is not universal library
InMessage adoption. No fresh rendering benchmark or Daybreak review is claimed.
The work remains uncommitted and publication remains held.

## Implementation findings

Native completion accepts authenticated Model-first input executors separately
from ordinary local Message producers. Flat input-result evidence retains only
the additional requirements and registration checks; ordinary operations do not
force a second traversal of the update graph.

Named Definition boundaries keep the new helpers usable in real external
declaration emission. They also avoid the measured Machine compiler regression
from the initial inline type encoding. The existing budgets were not increased.

Receive runs under the Composition's original normalized Binding graph and
selected policies. Reusing the public Binding wrapper array was insufficient;
the actual mobile-menu and nested validation flows exposed that error. Family
contracts also publish their input Schema and reserve the `InMessage` member.

## Preserved research

`inMessage.ts` beside this report is the earlier unconnected draft, not the
implementation. The source audits in `consumer-design.md` and
`runtime-design.md` retain their original proposed status. The frozen
`baseline/` capture predates this phase. The `helper-inputs` proof isolates the
Step input-contract work used by the integrated implementation.
