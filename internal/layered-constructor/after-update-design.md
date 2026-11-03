# Same-dispatch transition tails | Issue 1868

Initial design investigation of [#1868](https://github.com/foldkit/foldkit/issues/1868) against the current constructor-owned Blocks implementation. A subsequent bounded prototype is archived in [after-update/README.md](after-update/README.md). Its runtime cases passed, but valid inline producer inference failed. Its production edits were restored. The following is a proposal, not an installed or approved API.

## Recommendation

This is a real lost capability. Add a small, Composition-owned transformation of an already checked update plan. Do not accept arbitrary wrappers at completion.

Proposed spelling:

```ts
const update = ApplicationComposition.makeUpdate.withAfter(
  ApplicationComposition.makeUpdate({
    ClickedIncrement: increment,
    ClickedReset: reset,
    CompletedSaveCount: makeNoopStep(),
  }),
  before => Update.combineSteps(afterMessage(before)),
)
```

The second argument produces **one silent Step** from the previous Model. That Step receives the fully updated Model. A named factory can be passed directly; the inline callback's Model, Message, and context types come from the first plan. Existing `.withContext(...)` plans can be transformed without adding another exhaustive-record overload:

```ts
const update = ApplicationComposition.makeUpdate.withAfter(
  baseUpdate,
  (before, message, ...context) => settle(before, message, ...context),
)
```

Here `settle` returns a Step. The callback may ignore Message/context when the policy only compares Models. The issue author's actual `afterMessage(before, saveWrite)` already returns a list of Steps for music, focus, run counts, analytics, and persistence. `Update.combineSteps(afterMessage(before))` adapts that list once. Its synced-save exception can remain a Message-dependent choice of `saveWrite` in this one callback.

Accept a checked plan first, rather than another cases record. This keeps the existing record inference, contextual inference, and extracted update modules intact. It also avoids adding the contextual cases machinery to another public overload.

## Why the existing API cannot express it

- `block/delivery.ts` stores each function created by one `makeCompositionUpdate` in a private `ownedUpdates` WeakSet. `complete` rejects a wrapper, including one that merely calls the original function and appends Commands.
- Canonical update values are passive plans. `experimental/hybrid/authoring.ts` authenticates their static Composition during `compilePlan`; the acquired native update is then checked again by native completion. Copying an update plan does not preserve either registration.
- Adding the tail to every local handler misses child deliveries unless every child policy repeats it too. A Subscription introduces a later Message and cannot preserve this same-dispatch contract.

The issue includes a concrete port with more than 100 repeated sites. Its linked `settle.ts` also notes nested folds can currently settle twice. Centralizing at the owning update boundary addresses both omission and placement problems.

## Semantics to keep small and precise

1. Capture the original Model, perform the existing local-handler or child-routing path, resolve all operation/init recipes and OutMessage policies, then run the tail once on that final Model.
2. Append tail Commands after the existing Commands. Keep the existing OutMessage unchanged. The tail may transform the Model and produce Commands, but initially cannot emit an OutMessage. Supporting two competing OutMessages would require a separate explicit policy; this use case does not need it.
3. Validate silence after resolving connected recipes and child policies, not only from a superficially plain Step type. An OutMessage hidden behind a bound operation must not be discarded. An erased tail that actually emits one must fail at runtime.
4. Invalid or forged delivery throws before the tail. A valid ignored route or missing child produces the ordinary unchanged Model, then runs the tail once; state comparisons can decide that no Command is needed. Runtime generation rejection still happens before update and is unchanged.
5. Each owner runs its own tail. A child's update and a parent's completed fold are separate owning transitions. Calling a child operation inside a parent handler must not rerun the parent tail midway through that handler.
6. Construction and init do not run the tail. Command completion Messages take the normal update path. No effects run during the transition; saves and music remain Commands, and workflow state remains Model-owned.

## Type and provenance implications

The output must retain the original per-Message channel tuples. Add the common tail's requirements and registration evidence to every tuple; retain each original tag's OutMessage exactly. The aggregate return also includes the tail channels for routed-only updates. Do not rebuild the type from only `ReturnType<BaseUpdate>`, which would flatten the existing per-tag information.

The tail's potential Service requirements legitimately apply to every dispatch where it runs. A shared conditional callback does not establish different Service requirements per Message merely because it inspects a tag. No stronger per-tag inference is being promised. Original per-tag channels remain intact beneath this common contribution.

Use the existing authored-output validation and recipe resolution for tail Commands, their local/generated Message contracts, resource requirements, and Binding registration evidence. Completion must still reject undeclared Services, foreign child operations, erased result channels, and discarded child-policy OutMessages. Input-only Commands remain invalid Command results.

The returned plan keeps the same static source and is enrolled by the library. Its base plan must be an original Update plan from that Composition. At native compilation, the corresponding owned base function must belong to the same `makeCompositionUpdate` factory. This preserves both existing provenance checks. Structurally identical separately created Compositions are not made nominally distinct by TypeScript; runtime original-source checks remain necessary, as they are today.

Copy the base update's recorded contextual arity rather than infer it from a new wrapper's `Function.length`. Preserve direct and curried calls and the exact existing optional/default/rest context tuple. The transformation should not add context requirements. A routed-only update currently has no `.withContext` branch; adding new required context solely for its tail would be an additional API edge, outside this minimal form.

## InMessages

Generated requests invoke `receive` directly through authenticated compiled operations. They do not enter `update`, so an update-only tail cannot honestly mean every Model transition.

If the public promise includes received requests, provide the same owned transform on `makeReceive`:

```ts
const receive = ApplicationComposition.makeReceive.withAfter(
  baseReceive,
  before => settle(before),
)
```

The same extracted factory can serve both entry points. Receive retains its separate input/context contracts, per-input channels, and sparse `inMessageOutputs` bounds; completion must account for the added tail requirements. Do not route inputs through a synthetic local Message or apply one callback indiscriminately to two different context tuples. An initial update-only implementation can satisfy the reported local/child case, but its scope must be explicit.

## Small implementation seam

- **`block/delivery.ts`:** add an owned `withAfter` transformation to the native factory. Reuse the shared dual-dispatch/arity machinery and run the tail inside the same operation graph/environment after either local or routed resolution. Enroll the transformed function in `ownedUpdates`.
- **`experimental/hybrid/authoring.ts`:** add the passive plan transform. Check kind/source, compile the original plan against the actual Composition, and delegate to the native owned transform. Retain the same source on the resulting plan.
- **Authored update types / `block/operationOutputs.ts`:** use a named channel transformation that unions requirements/evidence without flattening tags or OutMessages. Preserve `DefinedUpdateSource` for native callers. Keep this dependency lightweight because the unchanged compiler ceilings are sensitive to authoring-type imports.
- **`experimental/contracted/inMessage.ts`, if receive parity is included:** use the same result-combination primitive with its own receiver WeakSet and input/context validation. Preserve compiled-operation result evidence used by completion.

The main difficulty is preserving exact result metadata across the owned transformation while retaining inline producer inference. The archived prototype does not yet meet that inference requirement. Source/emitted proof should precede adoption, particularly for generic family Blocks and routed-only owners. No compiler-cost or declaration-compactness claim is established by this investigation.

## Required proof before adoption

Use one parent with a local change and a real child fold, plus a save Command and typed external Service. Prove before/final Model comparison, ordering, one invocation per parent dispatch, sequential tail Steps, and preservation of the original OutMessage. Include direct/curried contextual calls and one routed-only case.

Source and strict emitted consumers must retain exact per-tag OutMessages and add only the actual shared tail requirements/evidence. Reject an OutMessage-producing tail, wrong local/input Command result, foreign Binding, foreign plan/source, and unresolved Service. If receive is supported, prove its independent Context and one generated request with an accepted OutMessage.

Useful copied controls: bypass the routed tail, pass the original Model instead of the final Model, discard the original OutMessage, omit tail requirement/evidence projection, or weaken source authentication. Keep lifecycle tests focused on new behavior; existing Runtime resource ownership and generation tests need not be duplicated. Run unchanged compiler and declaration gates once the source shape is stable.
