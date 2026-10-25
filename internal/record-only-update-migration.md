# Record-only update migration

## Consumer contract

`Composition.makeUpdate` accepts an exhaustive record of local Message handlers.
The callback-taking overload is removed. Use `makeUpdate({})` when the Composition
has no local Messages, including when all delivery belongs to registered children.
Automatic child routing remains Composition-owned.

```ts
export const update = SearchComposition.makeUpdate({
  UpdatedQuery: (model, { query }) => ({
    model: modifyFields(model, { query: () => query }),
  }),
  RequestedClose: handleRequestedClose,
  CompletedSave: SearchDefinition.makeNoopStep(),
})
```

Handlers receive `(model, message)`. A compatible existing Step can be the record
value directly. Dedicated extracted handlers use `handle<MessageTag>`; shared
Steps retain their operation names. Payload adaptation and Model-derived inputs
still need callbacks. Raw-only handlers can return results directly, without
`makeStep` ceremony.

A real split-file example is Website's `update/update.ts`, which now supplies
`handleChangedUrl` and `handleCompletedLoadBrowserEnvironment` directly. Their
own modules retain the behavior and exact connected-Step contracts. There is no
extra forwarding callback in the handler record.

Dispatch context uses the existing context factory:

```ts
const UpdateContext = Schema.Struct({ roomId: Schema.String })
const update = RoomComposition.makeUpdate.withContext(
  (context: typeof UpdateContext.Type) => ({
    InformedOfJoin: (model, { player }) => join(model, player, context),
  }),
)
```

The factory requires an accurate context parameter contract. Required, optional,
defaulted, and rest arguments keep the call shapes
`update(model, message, ...context)` and `update(message)(model, ...context)`.
Construction remains passive. A factory runs for local delivery, not for a
Composition-routed child envelope.

## Precision and safety

Each handler retains its own inferred output. Completed Message-backed operations
select that handler's Commands, Services, OutMessage, and registration evidence.
Utilities inspecting the entire update still see the aggregate contract.

When branches of one handler mix raw results with connected recipes, its local
branches must use Definition-owned Steps. Separate unrelated handlers do not
need that repair. Completion still checks the graph and providers. No runtime
error is substituted for a previously enforceable source check.

The remaining enforcement boundary is unchanged: inaccurate upstream annotations
or arbitrary TypeScript width erasure can hide information before the helper
receives it. A wrapper cannot reconstruct a channel that a helper already erased.

The retained proof families include:

- `declaration-tests/record-update.{accepted,rejected,consume}.ts`: local payloads,
  Model, selected outputs, contexts, exact operations, handler completeness,
  invalid/any/never results, and removed callbacks.
- `declaration-tests/dual-update.*.ts`: direct/curried dispatch, optional/default/
  rest context, exact utility and registration contracts.
- `declaration-tests/callback-guard.*.ts`: the historical filename retains
  per-handler mixed raw/connected rejection and its canonical Step repair.
- `declaration-tests/combined-outmessage.*.ts`: connected composition cannot
  discard a registered policy's OutMessage.
- `src/block/recordUpdate.test.ts`: passive construction, selected handler
  execution, direct/curried and operation equivalence, context factories, routed
  child delivery, and message-free records.
- UI generic source/emitted consumers retain exact default and `forRoot` Slider
  operation channels. Shared generic guards keep their existing honest contracts.

## Verification state

This is an in-progress integration report, not a Ready declaration.

A later lean-validation experiment passed the five count budgets but failed broader source and external declaration checks: valid connected unions were overrejected, and an enriched raw Model leaked a private graph capability into one UI declaration. That snapshot was withdrawn. Do not use its count result as final evidence or combine its temporary source with an earlier built distribution. A retained candidate must pass the gates together against matching source and declarations.

Consumer migrations, active documentation, scaffolds, and focused lint migration
are implemented. The full lint plugin suite passes 580 tests across 37 files.
UI's 1,296-test runtime suite passed before the final Slider precision assertion;
its focused Slider followup passes 74 tests. Website's final split-file handler
change passes its source check and 66 focused Story/navigation tests. Workspace
class composition and the three discussed authoring cleanups preserve behavior;
its latest runtime run passes 153 tests across 20 files, including concurrent
consumer additions. Source checks are refreshed after the core experiment is
stable.

Compact per-Message channel metadata passes the full core source check, focused
source/emitted cases, and the full UI declaration build. It removes the private
graph-symbol leaks exposed by the lean metadata experiment. Two unchanged
Workspace compiler ceilings still fail, so this candidate is not retained as
release evidence. The final external UI declaration harness and current core
runtime gates follow a coherent source/build freeze.

The expanded Workspace root declaration-size failure remains a separate open
gate. A framework-only normalization prototype clears emission but adds roughly
2,000 internal lines and exceeds compiler ceilings; it is rejected. A smaller
isolated alternative uses the existing APIs and two private application contracts:
an exact Binding tuple and an implementation interface derived from the actual
functions. Full root emission and relocated accepted/rejected checks pass, but
this alternative is not integrated until the final core candidate passes. Its
check-time measurements overlap the control and do not demonstrate an editor
speedup.

A focused probe also shows that non-tagged or mixed tagged/non-tagged local
Message Schemas can evade a record's completeness check. The record-only authoring
boundary needs to reject those contracts while preserving genuinely message-free
and routed-only `makeUpdate({})`. This is being addressed as a compile-time gate.

Older packed artifacts and editor measurements do not cover this production-code
delta. Freeze the integrated source, rerun affected evidence, and refresh the
inclusive package/consumer review before seeking publication approval. Published
Ready remains `1f6776fa7ececa766188df5201eefec6ba781b5d`.
