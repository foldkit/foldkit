# Workspace consumer friction assessment

## Current October 25 disposition

Public pending-Command inspection is retained as `Story.Command.argsOf` and `Scene.Command.argsOf`; the inline property signature resolves the earlier compiler-cost excess. Focused compiler diagnostics are also retained. [Current API, verification, editor measurements, and boundaries](composition-feedback-closeout.md). The failed controls below preserve their original experimental scope and are not approved deferrals.

The expanded Workspace root now uses ordinary Website-style assembly. Exporting its existing exact Binding tuple type lets TypeScript name that graph across modules, removing the extra implementation interface and return annotation from `block.ts`. Actual whole-root emission and strict relocation pass on unchanged framework artifacts. The tuple remains an explicit inventory; inline graph inference still exceeds the serializer limit. [Current proof, paired editor results and limits](workspace-clean-assembly-20261025.md).

## Expanded Workspace serialization boundary

The ordinary root reproduced TS7056 at private `prepare` in `src/block.ts` and `ApplicationComposition` in the current flat `src/composition.ts`. The frozen control used delivery source SHA-256 `bfcb999597654396bf9f6c199970b4aa46c85bf513a904d6aa10a6f41c73949e` and declaration SHA-256 `f79790d6282f38cdfca5af21cbcad22f604adea6cd6bf5b6ad89011432b89a86`, with the rebuilt UI and current Workspace callers.

The earlier repair named a private implementation interface through the five existing `typeof` function and Layer references in `block.ts`. Its `prepare` return named the existing `AssemblyDraft<CompletedWithView<...>>` contract, while `prepareBlock`, `satisfies`, and the checked `FromAssemblyWithView` export remained active. The Composition named the exact tuple of its nine existing Bindings and checked the value against that tuple. These references gave declaration emission stable names for the two expanding nodes without a new public helper or runtime stage.

This earlier boundary followed a concrete TS7056 failure. Graph size alone supplies no threshold. It required updating both the Binding inventories and the implementation inventory. The current repair retains only the named Binding tuple; the results below describe the earlier two-file control.

The isolated repair emits 110 declaration files totaling 11,452,935 bytes. Source and strict relocated checks retain mutual assignability with the inferred contract, exact root requirements, Message and Binding channels, and the rejection controls above. The overall declarations remain large.

One paired `noEmit` check on identical source and dependencies produced:

| Root contract  | Instantiations |   Types | Reported memory |
| -------------- | -------------: | ------: | --------------: |
| Inferred       |     14,404,491 | 919,507 |        777,346K |
| Named boundary |     14,013,359 | 952,044 |        801,021K |

The named boundary reduces instantiations while increasing Types and memory in this control. The approximately 2.06-second check times are single-run observations. Editor performance requires separate measurement. Earlier performance checkpoints below retain their original source scope.

## Earlier integrated disposition

The approved record/context update API, canonical mixed-result guard, connected OutMessage protection, and named public UI headers are integrated. Source/emitted rejection, runtime tests and compiler budgets pass. The expanded Workspace root now emits and relocates after two internal callable interfaces preserve its existing update and Document-view contracts. Its four direct property controls remain unchanged. The separate 32-group synthetic root still reaches TS7056. See [the integrated report](preview-framework-performance.md) and [current task status](next-preview-tasks.md).

The first integrated benchmark preceded queued Workspace UI work and the internal repair. It recorded a repeatable Website cold-access/post-edit cost alongside similar Workspace and runtime results. The [final post-change comparison](preview-framework-performance.md#final-post-change-benchmark) is complete and retains the measured Website editor costs. The historical measurements and rejected controls below retain their original scope; they do not describe an open failure in the now-repaired real Workspace root.

## Earlier declaration serialization repair

The adopted `CompletedUpdate` and `OwnedDocumentView` interfaces retain the existing dual update signatures, exact context tuple, output channels, owner invariance, and graph/view evidence. No consumer API or storage change is required. The original encoding and either single-interface removal reproduce the expanded root's failure, so both names belong to the repair.

The full application now emits 80 declarations totaling 7,000,351 bytes and passes strict relocated accepted/rejected checks. Core/UI source, builds and complete external declaration harnesses pass, as do all five unchanged compiler ceilings. All 280 emitted core JavaScript files are byte-identical to the control. Independent review found no inference, variance, safety, or declaration-portability objection.

The 32-group aggregate-operation root still reaches TS7056. This is a specific remaining serialization limit, not a universal Block-count ceiling. Declaration emission and count budgets establish no editor speedup; the final editor measurements remain a separate result from declaration emission. [Repair evidence](preview-framework-performance.md#named-contract-serialization-repair).

## Connected combinations and OutMessages

Retained-draft reporting exposed a new case beyond the earlier ordinary-Step diagnostic assessment. A connected operation's selected Binding policy can emit a parent OutMessage only after graph resolution. `combineSteps` previously accepted that opaque operation and silently dropped the OutMessage. The application now returns its full result directly.

The archived guard candidate carries exact constituent policy evidence as `DeferredResultEvidence<DeferredCombinedStepsPolicy<ExactPolicyEvidence>>`. It survives extracted/nested Definition Steps and conditional returns. Composition-owned update/init resolve that evidence and reject a combination that would discard an OutMessage. Policy-local combinations contribute a private, impossible registration token when their resolved operation can emit. Direct policy channels are inspected even on a repeated placement; only recursive descent stops, covering self-reference and A → B → A without hiding an emission. Consuming policies and reciprocal coordination have accepted controls. This static candidate is not adopted; the shared source retains the actionable runtime safeguard.

The interface-factoring candidate met every compiler ceiling: deep 599,190 Instantiations / 51,679 Types; wide 1,154,283 / 73,993; Commands 331,803 / 62,191; workspace four groups 2,612,970 / 205,988; workspace eight groups 4,447,914 / 280,033. It is **not an accepted safety result**: external declaration rejection checks found that generic interface comparison allowed optional/union Command and registration channels to be erased. The required negative fixtures are retained. A sound structural encoding must pass them before its counts can support adoption. `BindingAt` uses `Extract`; no budget was raised.

**Historical release blocker, resolved by the integrated surface:** constructor-backed operations inherited the child update's whole OutMessage contract. Animation's `requestShow`/`requestHide` and Calendar's `requestDropToDays` do not emit at runtime, but their public types permit it. The accurate guard therefore rejects DatePicker's combined operations and Toast's dynamic collection of hides. Returning the last operation cannot repair the multi-operation case. UI source and emitted checks fail, so passing the core and compiler-count controls does not establish an integrated release fix.

An unchecked `makeOperation(Message.RequestedShow, { outMessage: false })` promise was rejected as a solution: a runtime assertion cannot establish the required static guarantee. The handler-record alternative below is also not adopted. The static guard was selectively removed from shared source so existing UI consumers typecheck; neither that rollback nor runtime rejection closes the release blocker.

Earlier completion-time controls established that the check was possible but initially exceeded the Types ceilings by 154 and 214. They used either a private atomic OutMessage sentinel or an impossible registration token in existing deferred policy routing, without a second graph sweep. The interface factoring made the registration-token counts fit only by invalidating existing channel-erasure checks; it supplied no acceptable budget result. These controls demonstrate encoding failures, not a TypeScript impossibility.

The final sound control reused the already-resolved registration evidence at update/init authoring instead of separately traversing OutMessages. It passed the complete external declaration harness, including the original erasure rejections, but exceeded Types ceilings: four groups 207,294 / 206,314; eight groups 281,931 / 280,523. It is not retained in shared source. The full local patch is `/tmp/deferred-combined-resolved-registration-final.patch`; `/tmp/deferred-combined-policy-fold-controls.md` records the controls. The encoding and measurements above remain available independently of those temporary paths.

### Per-Message operation contract prototype

The current callback-based update returns one contract for all local Messages. The isolated alternative makes the handler record explicit:

```ts
export const update = AnimationComposition.makeUpdate({
  Showed: model => showTransition(model),
  RequestedHide: model => hideTransition(model),
  EndedAnimation: (model, { generation }) =>
    finishTransition(model, generation),
  // Every other local Message also has one handler.
})
```

The prototype dispatches the same Messages synchronously through the completed update. A private per-tag output map in `delivery.ts` lets `definition.ts` project constructor and tuple-backed operations through the selected handler output. `binding.ts` omits deferred OutMessage-policy evidence only when that exact operation is silent. Child registration and the Block's complete update/handler contract remain separate concerns.

With per-handler validation temporarily omitted, core source/build and the real migrated Animation compiled; Toast's dynamic keyed `dismissEntries` combination then compiled. This is mechanism evidence, **not a passing safety proof**. Restoring mandatory `ValidateAuthoredUpdate` validation through a rest-parameter gate made the record overload fail selection for Animation. There is no accepted emitted-consumer or compiler-budget result. A perf run from the mixed prototype checkout was confounded by its other metadata changes and is excluded from the matcher measurements.

No public record overload or consumer conversion is adopted. The smallest next proof is to resolve `AuthoredUpdateCaseErrors`, then pair accepted cases with missing/extra handlers, invalid Models/Messages/OutMessages, erased and impossible outputs, context arguments, exact requirements, registration, generic factories, external emission, and immutable compiler budgets. The isolated implementation is retained at `/tmp/foldkit-record-update-prototype`. Runtime assertions and finite overload-introspection tricks do not replace those checks.

#### Validated per-Message follow-up

The separate `/private/tmp/foldkit-record-update-validated` control resolves mandatory handler validation with a reverse-mapped output record. Removing that validation makes fourteen negative checks fail, so the passing result does not depend on omitted checks. Record updates retain exact per-tag operation outputs through a named phantom contract; callback updates retain their existing aggregate output. A context factory (`makeUpdate.withContext`) preserves required, optional, defaulted, array-rest, and required tuple-rest arguments, evaluates on dispatch, and retains direct/curried and constructor/tuple operation behavior.

Full core and UI source checks, the original external declaration/relocation harness, thirteen focused core runtime tests, and 272 Animation/Calendar/DatePicker/Toast tests pass in the isolated control. Actual mutations adding an OutMessage to Animation show/hide or Calendar's drop-to-days operation reject their real combined consumers. Removing Animation finish's OutMessage fails exact output assertions and runtime expectations. Silent operations are accepted even when their Block declares an OutMessage Schema; genuinely emitting operations retain the policy obligation.

This is not an accepted release fix. The data-first connected combination's return-position `NoInfer` hides deferred evidence; removing it restores the inline rejection. The complete sound control exceeds the unchanged Workspace ceilings: four groups 2,636,566 Instantiations / 208,180 Types, and eight groups 4,622,554 / 309,949. A cheap phantom-key fast path changes these counts only slightly. Exposing a registration carrier outside the original `NoInfer` wrapper fails the inline rejection tests and is rejected.

Follow-up cost controls refine that attribution. Restoring the original data-first `NoInfer` produces identical eight-group counts: the measured Workspace fixtures contain no `combineSteps` calls. The wrapper therefore explains the inline safety failure, not this fixture's cost increase. Putting the existing callback overload before the record overload reduces the control to 2,630,462 / 207,090 at four groups and 4,611,943 / 308,092 at eight, still over budget. Every source mutation was followed by a successful isolated core build before measuring its emitted declarations.

Combining the sound callback-first record source with the callback guard and named Workspace interfaces also fails: four groups 2,554,281 / 206,708, eight groups 4,456,106 / 305,375. Source and thirty focused runtime tests pass, but no full integration or editor-speed conclusion follows from a failed compiler gate. The callback guard's UI scope audit identifies three primary production sites (DatePicker, Dialog, and Toast); downstream assembly diagnostics were retained as cascades and not mechanically migrated. The combined failed control remains isolated at `/private/tmp/foldkit-release-blocker-record-combined-20261023`.

Independent eight-group ablations identify a coupled evaluation path rather than independent additive costs. Each control starts from the frozen callback-first source, successfully builds its changed package declarations, and then measures the original fixture. None is an adopted safety result:

| Diagnostic control                                            | Instantiations |   Types |
| ------------------------------------------------------------- | -------------: | ------: |
| Complete sound candidate                                      |      4,611,943 | 308,092 |
| Replace selected-operation projection with aggregate fallback |      4,470,126 | 281,549 |
| Remove update/init combined-policy validation (unsafe)        |      4,464,862 | 280,755 |
| Restore the original always-deferred Binding operation recipe |      4,468,626 | 281,249 |

The last control removes 26,843 of the candidate's 27,569 excess Types. It retains the record overload, operation projection, and validators. The new `[OutMessageOfProducer<ChildProducer>] extends [never]` recipe branch therefore triggers expensive evaluation through selected-operation projection, deferred policy resolution, and authored update/init validation. Removing only the public record overload could not be measured under the bounded control: its now-unused helper declarations trigger TS6196, and no cleanup was added to that experiment. Source/dist hashes and raw build/performance logs are preserved at `/private/tmp/foldkit-record-cost-attribution-20261023/.cost-attribution`.

These ablations motivated the producer-side hint control below: retain the same visible-contract checks without repeatedly extracting an operation's full return type through the graph.

#### Producer-side emission hint control

The `/private/tmp/foldkit-record-operation-hint-20261023` follow-up derives an invariant emission flag while projecting a completed operation. The Binding recipe reads that private flag instead of re-extracting its full return type. Missing, widened, optional, union, `any`, `unknown`, and `never` hints conservatively retain policy evidence. There is no consumer silence promise and no runtime metadata access. The private symbol stays unexported; emitted declarations require a named type-only `OperationEmission` export. Required metadata changes reverse whole-function assignability, so exact Parameters, ReturnType, and callable-shape checks remain explicit rather than treating a plain function as a generated operation.

Core/UI source, both full external/rejected/relocated declaration harnesses, forty focused core tests, and 272 real UI tests pass in that isolated component. Adding an actual OutMessage to show/hide/drop still rejects the corresponding combined UI operation. Forcing the Binding check to accept all operations as silent makes four required rejection directives unused. All mutation sources were restored. The earlier upstream-helper contract limitation remains unchanged.

The pure component still exceeds Types ceilings: four groups 2,634,904 / 207,466; eight groups 4,484,892 / 281,899. Its combined control with the callback guard and named headers passes all five unchanged ceilings. This demonstrates a nonlinear interaction; neither the failed pure result nor the passing combination is substituted for the other.

The complete isolated candidate at `/private/tmp/foldkit-release-blocker-hint-combined-20261023` now records:

| Unchanged fixture      | Instantiations |   Types |
| ---------------------- | -------------: | ------: |
| Deep eight             |        605,086 |  52,004 |
| Wide hundred           |      1,155,728 |  74,181 |
| Commands two hundred   |        332,535 |  62,380 |
| Workspace four groups  |      2,547,769 | 204,439 |
| Workspace eight groups |      4,331,309 | 279,180 |

Core/UI source checks, both original external/rejected/relocated declaration harnesses, and full Workspace declaration emission plus relocated consumption pass in this combination. The three real UI primary guard sites are DatePicker, Dialog, and Toast; 189 focused UI runtime tests and 57 focused core tests pass after their isolated conversions. The earlier canonical Workspace conversion passed all 109 application tests; current source/emission/relocation checks remain green. Generator regeneration is exact. Final direct pinned-compiler source, external declaration, and unchanged-budget reruns pass. Lint recognition, native method documentation/completion, and all six paired Workspace editor runs also pass. The complete Oxlint plugin suite has 577 passing tests, including 54 real-Oxlint integration cases; the Vite plugin suite passes 331 tests with three existing skips. No shared API or consumer migration is adopted.

An independent Astra Max review accepts the producer hint within the existing readonly completed-Block contract. Portable source/emitted controls show that decorating a tuple or Schema Message producer with stale silent metadata cannot suppress emission: assembly derives fresh metadata. The hint does not seal a completed contract against deliberate rewriting with `Object.assign`, and explicit plain-function retyping loses the hint conservatively. Existing generic UI `Completed` interfaces inherit the hint; they are not an example of metadata erasure.

The record also cannot recover an OutMessage contract already lost through ordinary upstream function inference. Explicit runtime controls cover a direct conditional plus Match, an extracted raw helper, and a canonical wrapper around an already-erased helper: their inferred signatures can appear silent while runtime emits. A stricter canonical-result gate rejects the first two shapes but cannot repair the wrapper. Accurate standalone helper contracts remain necessary; no universal runtime-silence proof is claimed. These limitations and the compiler-cost failure must be resolved or bounded explicitly before recommending a new authoring form.

#### Consumer surface for review

The recommended bounded change adds a handler-record form to the existing Composition helper. It does not add another architectural stage. This complete record from the accepted Counter fixture retains separate silent, emitting, and Command-producing operation contracts:

```ts
export const update = CounterComposition.makeUpdate({
  RequestedQuiet: CounterDefinition.makeFieldsStep(() => ({
    count: count => count + 1,
  })),
  RequestedReport: (model, { amount }) =>
    CounterDefinition.makeOutMessageStep(
      OutMessage.ReportedCount({ count: model.count + amount }),
    )(model),
  RequestedSave: CounterDefinition.makeCommandsStep(() => [Save()]),
  CompletedSave: CounterDefinition.makeNoopStep(),
})
```

Operations still name Message constructors or tuple producers in `prepareBlock`; parents still invoke their Binding operations. A silent selected handler can participate in `combineSteps`. An emitting handler, or a registered policy that emits, cannot be combined in a way that discards its OutMessage. Handler completeness and Command/result validation remain checked at authoring and assembly.

Context-dependent records use one factory. Required, optional/defaulted, and rest arguments remain exact; direct and curried update calls keep their existing call shapes:

```ts
export const update = CounterComposition.makeUpdate.withContext(
  (multiplier: number) => ({
    RequestedQuiet: model => CounterDefinition.makeNoopStep()(model),
    RequestedReport: (model, { amount }) =>
      CounterDefinition.makeOutMessageStep(
        OutMessage.ReportedCount({
          count: (model.count + amount) * multiplier,
        }),
      )(model),
    RequestedSave: model =>
      CounterDefinition.makeCommandsStep(() => [Save()])(model),
    CompletedSave: model => CounterDefinition.makeNoopStep()(model),
  }),
)
```

The factory is passive until an authored local dispatch, then produces the handlers for that dispatch. It does not run for a routed child-only dispatch. Unlike the context-free record, directly assigning generic Steps to context-factory fields can lose contextual inference; the explicit `model => step(model)` wrapper is the passing form. This is an ergonomic cost, not a need for consumer Model annotations or generic output lists.

The existing callback form remains useful when one aggregate output contract is intentional. A callback mixing connected operations with local transitions must use canonical Definition-owned Step results for those local branches. A raw `{ model }` beside a connected recipe now receives the explicit repair diagnostic. Raw-only callbacks remain supported. The isolated Workspace repairs show the cost: meaningful named Steps are readable; one-off field/no-op wrapping adds ceremony. The real DatePicker, Dialog, and Toast record conversions supply a second consumer example rather than claiming the type fixtures alone establish ergonomics.

The declaration-serialization repair names the existing checked assembly contract without changing runtime assembly:

```ts
const prepare = () =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    view,
    subscriptions,
    managedResources,
    EffectsLayer: Layer.mergeAll(Command.EffectsLayer, subscriptions.layer),
  })
export interface ApplicationBlock extends Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> {}
export const ApplicationBlock: ApplicationBlock = Block.assemble(prepare)
```

The feature barrel still exports one name, `ApplicationBlock`; TypeScript re-exports its type and value together. The dependency direction is unchanged. This extra interface is TypeScript serialization scaffolding, not a new runtime concept or proof against deliberate ambient augmentation. The matching existing `FromAssembly*` variant remains necessary. Generic UI factories already have reusable named `Completed` interfaces. Recommend this header where large declaration-producing graphs need the boundary, rather than imposing another interface on every small noEmit application.

Internal costs are a reverse-mapped per-handler output contract, nameable private-symbol carrier interfaces, and a conservative compiler-derived emission flag. The flag avoids repeating full operation-return extraction through the graph; it is not a public `outMessage: false` promise. The independently reviewed source/emitted negative controls remain required.

The isolated lint prototype recognizes both new call forms and preserves direct-child mutation/manual-routing checks through simple extracted records and named factories. Owning Message construction is recognized inside inline records/context factories. That ownership rule can still false-positive inside separately declared cases/factories; spreads and arbitrary conditional record factories are not generally followed. No name-only exemption or universal lint-enforcement claim is introduced.

Current editor evidence is the [combined release-blocker gate](workspace-performance.md#combined-release-blocker-editor-gate). All stated bounded prototype gates pass. The read-only consumer scope audit identifies primary callback migrations in Typing Game's root update, Counters' update, Job Application's Education/Skills/WorkHistory/root updates, and Website's Example Detail/UI/Search/root updates. Counter passes unchanged. Their additional block/composition/init/view/story/entry errors are downstream cascades. These consumers have not been broadly converted.

The shared API, active docs, and published preview have not been migrated to this surface. Review this concrete authoring/header change before broad conversion; passing the isolated candidate is not publication approval.

### Mixed matcher return channels

A separate inference failure occurs when `Message.match` returns raw ordinary update objects alongside opaque connected recipes. Structural union reduction can discard the richer local Command/OutMessage branches under `{ model }` before Composition resolution. Native callback inference and an exhaustive matcher have different reduction behavior; passing runtime Story/Scene tests alone did not establish the inferred contract.

The rejected correction inspected each original case before forming the union and added absent `commands?: never` / `outMessage?: never` channels only for mixed Model/non-Model outputs. Core source, exact Command/OutMessage/registration assertions, runtime coverage, and the full core external declaration harness passed. The final bounded raw-shape fast path still exceeded Types ceilings: four groups 206,632 / 206,314; eight groups 280,757 / 280,523. UI external emission also failed TS4023 for Listbox's inferred `makeUpdate` result using `RegistrationEvidenceTypeId`. No private symbol export, budget increase, or generic matcher API change was adopted. The full patch is `/tmp/archived-matcher-channel-correction.patch`.

The current consumer repair uses the established Definition-owned Step helpers for local transitions. Those results name absent channels, unlike a raw `{ model }` result, and retain the exact local requirements when mixed with connected operations. The Workspace conversion and framework fixtures verify that supported form without casts or a broad declared return type. This repairs those consumers; it does not establish universal safety for raw inferred matcher results. The latter remains a release assessment item alongside precise operation contracts.

#### Isolated callback authoring guard

A newer bounded control rejects a callback whose inferred output mixes raw Model-returning records with connected recipes. It keeps raw-only updates supported and retains the existing validation for every accepted output. The repair uses the existing Definition-owned Step helpers; it introduces no new authoring method. Both optional absent-channel keys (`commands` and `outMessage`) are needed to distinguish a canonical local result from a raw record before structural union reduction.

The isolated implementation is a direct conditional in `ValidateAuthoredUpdate`: if `AuthoredOutputForm<Output>` contains both `Raw` and `Connected`, require an impossible property explaining the Definition-owned Step repair. All other outputs run the original context, output-kind, evidence, and channel validators. An earlier intersection/`Extract` encoding missed the Types ceilings and was rejected. This structural check does not prove that a function came from a Definition; manually authored exact result contracts remain possible. It cannot recover channels already erased inside an upstream helper.

Focused source, emitted, and physically relocated `skipLibCheck: false` consumers pass. Rejections cover matcher and direct-conditional mixtures, Command-only and OutMessage-only records, child initialization, keyed delivery, and explicitly annotated unions. Replacing the emitted guard with the settled declaration makes all seven original rejection sites fail with unused `@ts-expect-error`, then restoring it makes the check pass. Raw-only exact Command/OutMessage controls, generic factories, canonical mixed results, and their registration requirements remain accepted. After migrating only positive fixtures to the same canonical-Step form, the full core source check, original external declaration harness, native completion/configuration documentation checks, and 131 focused runtime tests pass. Existing rejection fixtures remain unchanged.

All five unchanged compiler ceilings pass: deep 598,317 Instantiations / 51,474 Types; wide 1,153,410 / 73,788; Commands 330,930 / 61,986; Workspace4 2,625,861 / 206,188; Workspace8 4,472,693 / 280,253. The synthetic Workspace control replaces three raw no-op branches per group with the existing `makeNoopStep` result. No ceiling changed. The real isolated Workspace required three update-module migrations and still passes its source check and all 109 tests. Naming a meaningful transition or reusing navigation is readable; one-off no-op/field branches incur some ceremony. This is consumer evidence for review, not an adopted convention.

The paired editor control is recorded in [Workspace performance](workspace-performance.md#isolated-callback-guard-comparison). Its ranges overlap and show no material regression. The candidate remains isolated at `/private/tmp/foldkit-callback-channel-proof-20261023`; no shared framework or application source has been migrated.

The final Workspace update retains `SaveIssue` plus the scoped Comment Composer `AddComment` handler requirements and its complete `Saved | ObservedIssue | ChangedDraft | Closed` OutMessage union. Source assertions check both contracts. The core external declaration fixtures separately verify owned local Steps alongside connected operations, including rejected registration and channel erasure.

One helper boundary needs a follow-up: `makeFieldsStep` returns the canonical Model without the contextual graph capability. Feeding its `.model` to a connected operation therefore fails registration checking. Combining that field Step with draft reporting is also unsuitable because reporting emits an OutMessage; the current compiler accepts that connected combination, but the runtime guard rejects it. The app instead returns `reportDraft(modifyFields(model, ...))`, retaining the contextual Model and complete connected result. No consumer cast, custom generic, or additional API was introduced.

## Scope and disposition

Assessed the current next-preview worktree at `31d8aad9fe` plus its current working changes and built public packages. The source report is [MyRemotely's comment on PR #1655](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6325362294), posted by artile on 2026-10-21 against preview `1fbeaffe6563`. Its application counts and timings describe that consumer's report; they were not independently reproduced.

| Reported concern                                                    | Current disposition                                                                                            | Smallest next action                                                                                                             |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Find a qualified pending Command and read its actual args           | Confirmed public test API gap; identity-aware resolution already works                                         | Assess an args-only identity predicate using the existing matcher                                                                |
| Share a generic helper that renders Mount-bearing Dialog Attributes | Confirmed across different parent Compositions; same-owner extraction and caller-owned renderer callbacks work | Add the realistic positive/negative declaration fixture and document the supported callback pattern before choosing any type API |
| Reset parent-local state and reinitialize a required child          | Existing `Binding.init` supports this; migration guidance lacks a concrete reset example                       | Add a reset example preserving parent identity and all child init Commands; distinguish reset from occurrence replacement        |
| `combineSteps` with an OutMessage has an indirect error             | Reproduced; existing active docs explain `withOutMessage`, compiler error remains indirect                     | Compiler Error Guide remedy added separately; assess diagnostic improvement separately                                           |
| Child Message constructors flagged inside Scene tests               | Addressed by current recommended and all preset test overrides                                                 | Retain config coverage; consumers with custom rule lists need equivalent overrides                                               |

The initial assessment below used temporary consumer probes without changing framework or application source. Subsequent verified follow-ups are recorded at the end. The two-interface repair closed full-root emission at that earlier checkpoint. The current expanded root failure is recorded at the top of this report, alongside the separate 32-group limit.

## Pending Command lookup

`packages/foldkit/src/test/story.ts` (`resolveCommand`) and `test/scene.ts` already resolve an original Definition through qualified child names. `test/bindingMatcher.ts` compares private source identity and original invocation name; instance matching also checks complete args. Displayed-name suffix matching is unnecessary for resolution and unsafe for lookup. Two different Definitions can share a displayed suffix.

At the initial assessment, the missing operation was supported lookup retaining captured args. The later `Command.argsOf` projection closes that gap; the following paragraphs preserve the initial probe. `StorySimulation.commands` and `SceneSimulation.commands` expose `AnyCommand`, whose `args` is only `Record<string, unknown> | undefined` (`test/internal.ts:39`). The public `Command` namespaces expose resolution and assertions, not identity inspection. The internal `__commandMatches` export already solves matching; DragAndDrop and Toast test helpers use it with runtime Schema checks. Animation's test namespace exposes its Definitions but does not supply the reported custom generation-discovery helper.

The initial predicate probe used the following consumer shape. It was not adopted; the verified projection below replaces it:

```ts
const matching = Array.filter(
  simulation.commands,
  Scene.Command.isFrom(Animation.test.WaitForPaint),
)
const pending = requireExactlyOne(matching)
const { generation } = pending.args
return Scene.Command.resolve(
  Animation.test.WaitForPaint({ generation }),
  Animation.AnimationBlock.Message.CompletedWaitForPaint({ generation }),
)(simulation)
```

`isFrom` above is an unshipped experiment. `requireExactlyOne` represents the consumer's own zero/multiple-match policy. A Definition can match several sibling occurrences; inspection must not quietly pick one or weaken the resolver's ambiguity checks.

**Safety boundary:** narrow only captured `args`. Keep the qualified `name`, existing keys, mapper chain, and any effect's original type. A qualified child Command's effect emits parent envelopes, so narrowing the whole pending value to `ReturnType<typeof Definition>` would incorrectly promise both the unqualified name and a child-local result Effect. The current public simulation type deliberately does not expose an effect at all.

A temporary declaration-only contract prototype verifies that `generation` becomes `number` while the qualified parent Effect stays a parent Effect. Source compilation, declaration emission, and a separate consumer of the emitted declaration passed; negative checks reject treating it as the local Command or unqualified literal name. It has no runtime implementation and does not decide the final public signature. Any later implementation still needs source-identity, same-name impostor, qualified args, interrupt, sibling/key ambiguity, and emitted-type coverage using the existing matcher tests rather than a second matching algorithm.

## Shared Mount-bearing rendering

`Dialog.RenderInfo.dialog` carries `ChildAttribute<Mount.RequirementsOf<typeof mounts>>` (`packages/ui/src/dialog/block.ts:483`). The parent builder checks these through its registered Binding capability. This is more specific than a generic builder's unspecified Mount parameter.

Temporary public-entry probes establish:

- An unconstrained `HtmlBuilder<Message, Mounts>` helper that spreads `dialog` into `h.dialog` fails TS2345, matching the report.
- `Mount.RequirementsOf<typeof Dialog.DialogBlock.mounts>` is already publicly expressible. `Block.ViewMountRequirementsOf` also exists, but takes an authored view, not a completed Block.
- Giving a shared full builder that raw Dialog requirement allows the helper body, but rejects the actual parent builder at its scoped Binding capability boundary. Adding a raw requirement union does not repair that call. A Mount-requirement extractor alone therefore does not establish a fix.
- A helper typed with `Block.ViewBuilderFor<typeof ParentComposition>` passes on the same owner's rendering path, as the Block guide already recommends.
- A helper receiving a caller-owned `renderDialog(attributes, children)` callback passes across the helper boundary. The callback retains the parent's inferred builder and renders the supplied Attributes. This preserves the report's working ownership pattern without casts.
- An owner without the Dialog Binding/Mount rejects those Attributes, including through the callback boundary. The checked negative is necessary; a broad builder cast would erase that guarantee.

Existing `declaration-tests/plain-view-helper.accepted.ts` covers same-owner helpers and a generic divider without Mount-bearing child Attributes. It does not cover this cross-owner Dialog wrapper. Add that consumer-shaped fixture and an active documentation example before considering a new reusable-builder contract. Do not treat the current same-owner alias as proof that the reported 54 shared helpers already migrate unchanged.

## Required child reset

The existing `Binding.init({ args, toParentModel })` is a passive recipe accepted intact by the owning Composition's update or a Definition-owned Step. It initializes the child, reconstructs the complete parent Model, and retains lifted child init Commands. It is not a readable `{ model, commands }` record. See `core/block.md` under `binding.init`, `block/initRecipe.ts`, and `block/bindingInitialization.test.ts`.

The tested reset shape was:

```ts
const reset = FormDefinition.makeStep(model =>
  DialogBinding.init({
    args: [{ id: model.dialog.id }],
    toParentModel: dialog =>
      Model.make({ applicationId: model.applicationId, draft: '', dialog }),
  }),
)
```

An update branch returns `reset(model)`. The temporary completed parent Block compiled and pure execution verified that reset cleared the draft, closed the initialized Dialog, preserved its ID, and preserved `applicationId`. Its initial child config used only `id`; a real consumer must pass its full intended init config, including animation/focus settings when relevant. Existing initialization tests separately cover child Command lifting and ordering.

For a child-defined business reset, expose the child's request as an operation and call the connected Binding operation. For deliberate fresh initialization, return the recipe intact. Do not spread `ChildBlock.init().model` or copy only a child's result Model. Neither this type/pure-transition proof nor `Binding.init` documentation establishes a fresh runtime occurrence generation or cancellation of old asynchronous work. A live Dialog lifecycle reset would need its own behavior proof before documenting that stronger guarantee.

The report's tagged-union placement shorthand and accessor `Some → None → Some` generation question are separate work. Current docs direct tagged variant storage to explicit accessors; this assessment did not prove the requested shorthand or that runtime transition. No accessor adapter is proposed here.

## Diagnostics and lint

An OutMessage-producing Step in `Update.combineSteps(model, [keep, emit])` was rejected with TS2769 and a final overload mismatch involving `Step<unknown, unknown, never>`, without a `withOutMessage` hint. A plain combination followed by `Update.withOutMessage(combined, OutMessage.Saved())` compiled. `page/previewUpgrade.md` and `page/core/block.md` already explain that remedy; `page/previewMigration.md` now also has the concise Compiler Error Guide row added separately by the lead during this assessment. The type diagnostic remains a separate usability finding after that documentation fix.

`packages/oxlint-plugin-foldkit/recommended.json:109` disables `no-child-message-construction-in-root` for `*.test`, `*.spec`, fixtures, and `test`/`tests` paths. The exported recommended/all configs retain that policy, and `test/configs.test.ts` checks their overrides. Constructing a child result Message for `Scene.Command.resolve` in a recognized test file is therefore permitted by current presets. A custom config that enables the rule directly without these overrides can still flag it; that does not establish a current preset false positive. This conclusion is from config/test-source inspection, not a fresh lint-suite run.

The broad stable-to-preview bridge/codemod request remains a migration-policy decision. This bounded check neither implements a compatibility layer nor claims the report's full application migration is complete.

## Reproduction evidence

Temporary directory: `/var/folders/54/f0j6__0970q7p_x68mh85tvc0000gn/T/foldkit-friction-6loqzxhl`. It links the current website `node_modules`, so imports use built `foldkit` and `@foldkit/ui` public entries. Run from this worktree:

```sh
node_modules/.bin/tsc -p /var/folders/54/f0j6__0970q7p_x68mh85tvc0000gn/T/foldkit-friction-6loqzxhl/tsconfig.checked.json --pretty false
node_modules/.bin/tsc -p /var/folders/54/f0j6__0970q7p_x68mh85tvc0000gn/T/foldkit-friction-6loqzxhl/tsconfig.reset.json --pretty false
node /var/folders/54/f0j6__0970q7p_x68mh85tvc0000gn/T/foldkit-friction-6loqzxhl/reset.ts
node_modules/.bin/tsc -p /var/folders/54/f0j6__0970q7p_x68mh85tvc0000gn/T/foldkit-friction-6loqzxhl/tsconfig.identity.json --pretty false
node_modules/.bin/tsc -p /var/folders/54/f0j6__0970q7p_x68mh85tvc0000gn/T/foldkit-friction-6loqzxhl/tsconfig.identity-consumer.json --pretty false
```

All five passed. Checked files use `@ts-expect-error` for the intended rejection cases, so an accidentally accepted case also fails verification. `tsconfig.json` with `helper.ts` preserves the original three unannotated Mount-helper failures; `tsconfig.diagnostic.json` preserves the unannotated `combineSteps` failure. The predicate files are a type-contract prototype only. No performance conclusion follows from these small compiler probes.

## Verified follow-ups

### Own field changes before an emitting child operation

The property controls update Issue Detail's own draft and then invoke Comment Composer's reporting operation. Its registered policy emits the retained parent draft. `combineSteps` cannot consume that parent OutMessage. The extracted helper derives its Model input from the bound reporting Step with `Parameters<typeof reportDraft>[0]`, which retains the graph capability through `modifyFields`, and returns the connected recipe intact. Its Saving branch returns the canonical no-op Step. An extra outer `makeStep` adds no protection.

Source and relocated declaration checks accept that helper and reject missing Composer registration, invalid operation arguments, and combining away the parent OutMessage at `IssueDetailComposition.makeUpdate`. Passive construction of a combined recipe is earlier than that graph-dependent validation; rejecting only at the registered Composition is the supported boundary. Independent Astra review confirmed this distinction. There is no demonstrated runtime-only safety gap.

The one derived input annotation is consumer inference friction worth retaining on the task list. Do not replace it with a plain Model annotation that drops the graph or a cast. Comment Composer now uses a record update: its reporting operation has no Commands and returns exactly `ReportedDraft`. Reverting to the callback makes three exact contract assertions fail. Parent fold output remains conservative across all policy cases; narrowing the child operation does not prune those cases.

### Captured Command arguments: historical prototype controls

The bounded prototype used `Story.Command.argsOf(Definition)(pending)` and the equivalent Scene method. It returned `Option<exact captured args>` without retagging the pending Command. `Array.getSomes(Array.map(simulation.commands, Story.Command.argsOf(Paint)))` gave every matching args record; the caller chose the expected cardinality. A matching argless Definition returned `Some(undefined)`, distinguishable from no match. The helper trusted captured metadata, returned the original args reference, and did not construct Commands, decode Schemas, execute Effects, or select a Binding occurrence. This paragraph records the earlier prototype checkpoint. The API is now retained and documented; see [the current inspection contract](pending-command-inspection.md).

The predicate alternative was rejected after independent review. Intersecting only args can make TypeScript erase a legitimate negative branch when the existing args shape is already compatible, including argless Definitions. Adding source-proof types introduced repeated-check and declaration-nameability complications. Projection avoids these claims rather than requiring consumer annotations or exporting proof machinery. This is a limitation of that predicate encoding, not a claim that all possible predicates are impossible.

Prototype verification: 842 focused core tests and 58 DragAndDrop tests passed, as did core/UI source checks, builds, and the complete core external emitted-declaration harness. Positive/negative fixtures covered defaulted, generic, refined, union, erased, argless, and Interrupt Definitions. Real Story and Scene captures covered qualified sources, same-name foreign sources, name-only impostors, repeated inspection, multiple occurrences, unchanged resolver ambiguity, and passive reference-preserving behavior. Inferred split-file helpers emitted exact args and generic simulation-preserving resolver signatures, without result annotations, private symbols, or absolute paths. An independent Astra Max review inspected source and actual emitted signatures and found no correctness blockers. These results describe the experiment, not an adopted API.

The final compiler-budget gate failed. Isolated copied-package controls, with identical Effect realpaths and baseline subtraction, reproduced these exact deltas:

| Declaration encoding                            | Four-group Instantiations / Types | Eight-group Instantiations / Types |
| ----------------------------------------------- | --------------------------------: | ---------------------------------: |
| No helper                                       |               2,639,574 / 206,314 |                4,515,010 / 280,523 |
| Helper in Binding matcher or focused new module |               2,773,689 / 232,640 |                4,515,094 / 280,575 |
| Same helper in existing internal module         |               2,639,490 / 206,262 |                4,515,094 / 280,575 |

Removing both public properties but retaining their imports preserved the regression; removing properties and imports restored the original counts. The focused module eliminated the Binding-heavy declaration dependency but did not remove the count change. Moving the same aliases/signature into the already imported internal module repaired the larger four-group cost; the eight-group case still added 84 Instantiations and 52 Types. Removing a redundant conditional constraint made no further difference. The last excess is small (about 0.002% of eight-group Instantiations); it is not evidence of a perceptible editor regression. No editor-speed conclusion follows from these count controls.

None of those earlier encodings met both unchanged ceilings, so that checkpoint removed the prototype rather than increasing budgets. The later inline public signature resolves the excess and is now retained; [current contract and evidence](pending-command-inspection.md). Existing Binding-selected DragAndDrop and Toast lookups retain their internal occurrence-aware matchers and Schema checks; source inspection is not equivalent to their selection policy. The complete prototype is retained locally at `/private/tmp/foldkit-command-args-deferred`, with isolated controls at `/private/tmp/foldkit-args-of-perf-control`; the exact public contract, safety results, and rejected alternatives are recorded here for the next assessment.

### Shared Dialog views and child reset guidance

The real shared Dialog example now lives in UI's `declaration-tests/shared-dialog-renderer.*` fixtures. Two different parent Compositions share ordinary content and supply native renderers from their own inferred builders. The UI declaration harness passes source checking, isolated package builds, external emission, rejected wiring, and relocated consumption with `skipLibCheck: false`. Negative cases cover missing child registration, missing native Mount capability through a callback, passing a same-owner helper to an unregistered owner, and a foreign parent Message.

The View guide demonstrates that supported callback pattern through `viewSharedDialog.ts` and `viewSharedDialogCaller.ts`. The Init guide uses `initResetCounter.ts` and `initResetParent.ts` to distinguish a Message-backed domain reset from deliberate baseline initialization. All four snippets pass isolated strict source checks; Website source checking and formatting also pass. The lifecycle limitations described above remain explicit.

### Bounded OutMessage diagnostic assessment

Retain the current `combineSteps` encoding. Eight unannotated invalid calls were rejected against source and existing emitted declarations on TypeScript 7.1.0-beta. Existing OutMessage-Step, dual-update, and route-Step accepted/rejected fixtures also pass. These probes verify rejection; they do not make the current diagnostic clearer.

Two small controls were rejected:

1. Replace the OutMessage `never` branches in `StepsForModel` and `StepsWithoutOutMessage` with an impossible required property named `combineSteps cannot discard OutMessages: combine plain Steps, then attach the parent OutMessage with Update.withOutMessage`. Keep the existing overload order. All eight raw diagnostics remain byte-for-byte unchanged because TypeScript reports the later fallback overload.
2. Use that property and move the final two plain-Step fallback overloads before the graph-aware/general overloads. Deferred-call diagnostics improve, but all three data-first probes report a misleading missing `GraphCapabilityTypeId` on the Model. This is a regression for a common form.

Neither control is adopted. These are failed encodings, not a demonstrated TypeScript impossibility. The migration Compiler Error Guide now gives the existing repair: combine plain Steps, then attach the parent OutMessage with `Update.withOutMessage`. Connected child OutMessages belong in the Binding's declared policy. Further diagnostic improvement remains a usability follow-up, without weakening compile-time rejection or adding diagnostic-only overloads in this pass.
