# Connected-operation immediate-output precision plan

Status: **open implementation task; not an adopted API or completed change**.

This plan addresses one concrete false rejection: a child Binding policy may
emit a parent OutMessage for one child OutMessage variant while the operation
being composed can immediately produce only another, silent variant.
`Update.combineSteps` must remain strict whenever an applicable immediate
policy can emit. Global registration and later Command-result delivery remain
unchanged.

## Real consumer

The current Popover contract declares every input as producing the whole
OutMessage union:

- `packages/ui/src/popover/block.ts:186-190`
- `RequestedOpen`, `RequestedClose`, and
  `RequestedCloseWithoutRestoringFocus` currently use `OutMessage`.

The declarations must first become exact:

- `RequestedOpen: { outMessage: OutMessage.Opened }`
- `RequestedClose: { outMessage: OutMessage.Closed }`
- `RequestedCloseWithoutRestoringFocus: { outMessage: OutMessage.Closed }`

Runtime silence when the Popover is already open or closed is still represented
by the optional result field. These contracts state the only possible emitted
variant. Portable Bindings need the fact at declaration time, before the Layer
implementation exists.

The consumer exercising Binding close behavior is
`packages/ui/src/popover/bindingClose.story.test.ts`. A precision fixture should
give `Opened` a parent-OutMessage-producing policy and `Closed` a silent policy,
then compose a close operation with another parent Step.

## Existing seams to reuse

- `packages/foldkit/src/block/operationEmission.ts` already distinguishes an
  authenticated known-silent operation from a potentially emitting operation.
- `packages/foldkit/src/block/compiledOperation.ts` retains exact input-only
  output through private `InputOperationResult<Output>` evidence.
- `packages/foldkit/src/block/binding.ts` adds
  `DeferredBindingPolicy<Placement, ChildId>` only when immediate policy work is
  possible.
- `packages/foldkit/src/block/outMessageFoldContract.ts` already preserves
  exact per-tag `NormalizedFoldCaseData` in `NormalizedFoldEvidence` and
  `NormalizedOutMessageFold`.
- `packages/foldkit/src/block/deferredPolicy.ts` resolves deferred policy
  channels and creates the impossible registration used to reject an emitting
  connected Step inside `combineSteps`.

Do not weaken `StepsWithoutOutMessage`, the runtime OutMessage assertion, or
the invalid-registration check. Do not introduce partial OutMessage policies.

## Smallest coherent encoding

1. Extend `DeferredBindingPolicy` with a private immediate-case selector:
   `DeferredBindingPolicy<Placement, ChildId, ImmediateCase>`.

2. Represent `ImmediateCase` as either:

   - a finite child OutMessage `_tag` union, or
   - a private named `AllPolicyCases` sentinel.

   Do not use bare `unknown` for all cases or bare `never` for both missing and
   silent evidence. Evidence presence must distinguish authenticated silence
   from unavailable precision.

3. Obtain exact case evidence only from an authenticated projected/compiled
   operation. The narrow existing source is `InputOperationResult<Output>` on
   compiled InMessage operations. Extract its immediate `outMessage`, exclude
   `undefined`, and reduce a finite tagged union to its `_tag` union.

4. Preserve existing `OperationEmission<false>` behavior for authenticated
   known-silent operations: no deferred immediate-policy marker is needed.

5. Use `AllPolicyCases` for missing evidence, erased evidence, `any`, `unknown`,
   non-finite/broad string tags, or an emitting operation without exact
   authenticated output. These cases must preserve today's conservative union
   of all policy cases.

6. In `deferredPolicy.ts`, select only matching normalized fold data when the
   marker carries exact tags. Infer the Model and case data through
   `NormalizedOutMessageFold`, select matching `NormalizedFoldCaseData`, and
   reconstruct the applicable Step output. If normalized evidence is absent,
   selection finds no matching case, or evidence becomes erased, fall back to
   aggregate `OutMessagePolicyReturn<Policy>` rather than treating it as silent.

7. Keep forwarding conservative. Current forward evidence exposes only an
   aggregate return, not a per-tag result map. A mixed fold/forward policy may
   narrow its normalized fold but must retain the full forwarded OutMessage
   union.

8. Carry the selected marker through `DeferredResultEvidence` and nested
   `DeferredCombinedStepsPolicy` exactly as today. Direct child registration is
   independent and must remain on the original recipe.

## Required recursion correction

Current policy traversal tracks only `VisitedPlacements`. That is sound while
one visit evaluates the whole policy union, but becomes unsound after per-case
selection.

Supported counterexample:

1. Binding A immediately emits `Selected`.
2. A's `Selected` policy calls `A.requestClose()`.
3. That connected operation immediately emits `Closed`.
4. A's `Closed` policy has different Commands, registration, or OutMessage.

Skipping the second visit because placement A was already seen loses the
`Closed` channels. Existing reciprocal and self-referencing fold coverage is in
`packages/foldkit/src/block/outMessageFold.test.ts:850` and following.

Replace placement-only visitation with:

- exact visited keys `(placement, immediate tag)`, and
- an `AllPolicyCases(placement)` visited state that subsumes every exact tag at
  that placement.

Distribute finite tag unions before traversal. A same-placement/same-tag cycle
then terminates, while a same-placement/different-tag transition is analyzed.
An all-cases visit covers every later exact marker for that placement. The
state space remains finite: registered placements multiplied by finite child
OutMessage tags.

## Channel boundaries

- Precision applies only to the synchronous child OutMessage and the policy it
  invokes immediately.
- Preserve direct child Commands, Command Message type, requirements, and
  registration regardless of selected immediate policy.
- Preserve a selected silent fold's Commands, requirements, and nested Binding
  registrations. Silent means no immediate parent OutMessage, not no channels.
- A child Command that later produces a child Message/OutMessage remains routed
  through the globally registered child graph. That future delivery must not
  make the current `combineSteps` call appear to discard an immediate
  OutMessage.
- An exact applicable policy that emits a parent OutMessage must still produce
  `InvalidCombinedStepsRegistration` and reject composition.
- Missing or erased evidence must retain all cases and therefore reject when
  any policy case may emit.

## Bounded proof matrix

### Real Popover behavior

- Parent policy: `Opened` emits a declared parent OutMessage; `Closed` performs
  a silent field Step.
- Positive: compose
  `requestCloseWithoutRestoringFocus()` with an ordinary parent Step; execute
  and verify child close, policy field change, Commands, and Model ordering.
- Negative: the analogous `requestOpen()` combination fails at the completed
  Composition because it would discard the applicable parent OutMessage.
- Direct `requestOpen()` still surfaces its parent OutMessage.

### Recursion and graph safety

- Same Binding: `Selected -> requestClose -> Closed`, with only `Closed`
  emitting. A combination must reject, proving the second tag is visited.
- Same-placement/same-tag self-cycle terminates.
- Retain the existing reciprocal/self-fold tests and twelve-placement policy
  graph termination test.
- Selected silent policy invoking a registered sibling preserves the sibling
  requirement and registration.

### Evidence conservatism

- Exact union of two immediate tags selects both; one emitting case rejects.
- Authenticated no-OutMessage operation carries no immediate-policy marker.
- Missing, erased, `any`, `unknown`, broad-string-tag, raw fold, or
  non-normalized fold evidence evaluates all policy cases.
- A declaration facade or mutation that removes/widens the private evidence
  turns the close composition into a negative, never a false positive.

### Other policy forms

- Keyed Binding and key-dependent fold factory behave like the ordinary
  Binding path.
- Mixed fold/forward remains conservative for forwarding.
- Selected silent fold Commands retain exact Message and requirements.
- Child Command results still route through the registered graph later.

### Source and emitted consumers

- Source and source-free emitted consumers accept the precise silent close
  combination.
- Source and emitted negative fixtures reject the emitting open combination.
- Emitted declarations retain nameable private evidence and normalized fold
  case data without application annotations or unsafe casts.
- Mutation controls observe the evidence-erasure negative and the two recursion
  cases.

## Non-goals

- No change to runtime delivery ordering, child Command execution, policy
  exhaustiveness, Binding ownership, or graph membership checks.
- No relaxation of `combineSteps` OutMessage loss prevention.
- No inference of policy results from runtime values.
- No broad migration or new public annotation requirement.
- No claim that future Command-driven output is synchronously observable.
