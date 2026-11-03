# Checked update composition: runtime options

Read-only investigation of `da6e55193b` in the separate update-composition worktree. No source edits, builds, tests, archived patch application, or rejected inference probe were performed. All code below describes a proposed execution protocol; it is not an implemented or typechecked public API.

## Recommendation

Retain the ordinary exhaustive `Composition.makeUpdate(record)` as the default. For general composition, permit **exactly one full update plan** at an explicit position among Composition-owned stage parts. That plan handles both local Messages and child delivery. Other parts can be local record fragments or shared transitions.

This preserves general ordering. A shared normalization before the full plan runs before either a local handler or a child update. A shared transition after it sees the completed local result or the child result including its parent OutMessage fold. The original parent Model is captured once at entry, separately from the evolving Model.

The distinction between a full update and a stage part is useful here. An existing `makeUpdate(...)` value already means a complete dispatcher. Treating every such value as another ordinary stage would route a child repeatedly. Automatically selecting a routing point from a list of records would give ordering an implicit meaning. An explicit existing full plan provides that point without changing normal record authoring.

A conceptual list could contain:

```ts
;[
  normalizeWorkspace,
  localPreparation,
  applicationUpdate,
  localConsequences,
  persistChangedWorkspace,
]
```

Here `applicationUpdate` is the one existing full `makeUpdate(...)` plan. The two `local...` values are checked record parts; the other values are shared parts. This is an execution example, not a recommendation for an unbranded array API or a claim that plain functions can be distinguished automatically.

## What the current runtime actually does

- `block/delivery.ts:1143` creates one router per Composition. Its route table preserves the actual Binding identity, source token, and constructor-selected environment aliases.
- `delivery.ts:1255` builds a **complete dispatcher**. The route branch bypasses authored cases entirely. It runs `route.args` against the incoming parent Model and performs one connected fold. The local branch selects one record handler. Both resolve deferred operations against that Model and the immutable environment.
- `delivery.ts:1288` verifies envelope provenance; the adjacent checks retain the `Option` contract for route arguments. Missing or gated child work returns the unchanged Model.
- `delivery.ts:1319` owns direct and curried entry points. A private arity WeakMap preserves observable context, and `ownedUpdates` authenticates completion at `delivery.ts:1351`.
- `experimental/hybrid/authoring.ts:100` keeps passive plans in a private WeakMap. `compilePlan` at line 259 checks the exact source Composition. `makeAuthoringComposition` at line 572 does not invoke handlers while creating plans.
- `experimental/constructed/runtime.ts:380` builds a fresh actual Composition from the selected child connections and one immutable environment. Lines 475–484 compile the plans and pass the resulting update through native completion.
- `experimental/contracted/runtime.ts:300` snapshots the constructor body and authenticates its original Definition before compilation. Composition at line 452 registers the source used by that check.

Consequently, calling two existing completed updates sequentially routes the same child twice. Calling a complete update and then additional ordinary Steps can handle a tail, but cannot express arbitrary record/shared ordering with one routing point unless composition retains more than executable functions.

## Strong general ordering

For a flat list containing one full plan:

| Part                              | Local Message                                 | Child delivery                                 |
| --------------------------------- | --------------------------------------------- | ---------------------------------------------- |
| Shared before the full plan       | Runs on the incoming Model                    | Runs on the incoming Model                     |
| Local record before the full plan | Runs its matching handler                     | Skips                                          |
| Full plan                         | Runs its matching local handler once          | Routes and folds the child once                |
| Local record after the full plan  | Runs its matching handler on the latest Model | Skips                                          |
| Shared after the full plan        | Sees the latest local result                  | Sees the resolved child and parent fold result |

All parts receive the same original Message and dispatch context; only the Model evolves. A part must not redispatch that Message through another complete update. Parent-driven child operations deliberately performed by a stage remain ordinary connected operations, distinct from automatic envelope routing.

Route argument derivation, interaction gating, and child context projection occur at the full plan's position, using the Model produced by preceding stages. That is an observable and useful consequence of permitting pre-normalization. Envelope tag/provenance refusal can be factored ahead of user stages, while the actual fold and Model-dependent `route.args` stay at the anchor. Do not decode the entire Message again or introduce a new dispatch queue merely to compose stages.

Runtime generation checks remain outside this pure interpreter. A stale queued occurrence rejected before update must execute no stage. A valid envelope whose child is absent or gated at its routing position still completes a dispatch; later shared stages run on its unchanged result. An invalid envelope must throw before returning accumulated Commands. These semantics require focused controls rather than a new lifecycle mechanism.

## Small executable-plan seam

Keep a private immutable recipe for each authenticated update, instead of retaining only its executable identity:

1. Ordinary `makeUpdate(record)` records a full-plan recipe containing its local cases factory, context metadata, and one routing anchor. It remains callable exactly as today.
2. Record parts retain a checked finite tag set and handler/cases factory, without child routing.
3. Shared parts retain a normalized executor. Its internal inputs can include the original Model, current Model, original Message, and exact context tuple. This normalization is an implementation protocol, not additional application state.
4. A composition operation verifies every part's original Composition and verifies exactly one full-plan anchor. It flattens the recipes and returns a new authenticated full update. Completion still rejects arbitrary wrappers and forged/spread plans.
5. During acquisition, the passive composition compiles every original child plan against the same actual Composition. Existing `compilePlan(..., actual, source)` checks must remain in this path. A fresh outer plan must not conceal a foreign inner plan by calling its stored compile closure without checking the source.
6. The new native update is enrolled in the owning factory's private identity map. Native `prepareBlock` therefore continues to use its existing completion gate.

A private WeakMap can replace or accompany `ownedUpdates`; it need not add public fields or expose descendant implementation graphs. Stage parts require a distinct internal role so they cannot be passed to completion as complete updates. Runtime metadata belongs to the actual Composition factory; a process-wide declaration-to-current-implementation map is unnecessary.

The interpreter performs one synchronous pass:

- Save the original Model reference once.
- Classify the incoming Message and retain the existing tag/provenance checks.
- Enter the existing exact operation graph.
- Visit normalized parts in order. Skip local parts for child envelopes. At the full-plan anchor, execute either its local cases or its one child fold.
- Resolve each output with the **current intermediate Model** and the selected immutable operation environment before invoking the next part. Also finish a returned Binding init recipe through the existing interpreter when applicable.
- Accumulate Commands in stage order without recreating individual Command objects. Preserve their identity, interruption, scoping, and metadata.
- Return the final Model and the permitted OutMessage channel.

Do not implement this by wrapping `Update.combineSteps` around complete updates. Its silent-only result contract is different, and its deferred resolution path may restart its own fold when encountering a recipe (`update/update.ts:1116`). A new owner-level stage executor must not rerun earlier stage producers to recover deferred work. It already has an actual environment and can resolve each stage immediately.

### Nested composed plans

A composed plan is itself a full plan. When reused as the one full plan inside another composition, flatten its authenticated recipe rather than call it as an opaque function. Flattening keeps exactly one route and one outer original-Model snapshot. Calling it atomically instead would capture a second “original” Model after outer pre-stages; that would change before/after comparisons based on nesting.

This flattening must apply only to library-owned original plans from the exact same Composition. It is not permission to inspect or unwrap arbitrary functions.

## Alternatives

### Router outside all listed stages

One outer dispatcher can route a child first, then run local/shared parts in list order. It is simpler and makes all shared parts observe a child result.

Its ordering is asymmetric: a shared part before the first local record sees the untouched Model for local Messages but the already updated child Model for child deliveries. It cannot normalize a parent before child interaction gating or child context derivation. This is acceptable only if the public feature explicitly promises post-routing stages. It is too restrictive as the general composition recommendation.

### Every existing full plan becomes a local-only part

The native identity map could retain each complete plan's cases recipe and extract only its local work when composing. A single external router would handle children once. This allows existing plans to be reused and avoids repeated routing, but silently strips their full-dispatch meaning. It has the same route-placement problem as the previous option unless the API introduces an explicit routing marker.

If the API later wants this operation, make the conversion explicit. Do not infer it merely from a plan being nested in a list.

### Multiple complete dispatchers

Executing several full plans literally in list order is easy but performs repeated child handling and parent OutMessage folds. Skipping the second route only by tracking an ambient “already routed” flag makes a function's meaning depend on hidden caller state. Neither is a suitable checked default.

## Remaining authoring decisions

### Function forms need an honest calling convention

A Model-first Step and a Message-aware Model-first handler can share one protocol: call both with the current Model, Message, and context; a Step ignores the extra arguments. A callback that instead captures the **original** Model and returns a Step has a different protocol.

These cannot all be distinguished safely by `Function.length`: optional/default/rest parameters and zero-argument factories defeat that classification. There is no existing runtime Step identity marker in `block/focusedStep.ts`; its hint is type-only. Trying a callback and rerunning it with another Model would also violate once-only producer semantics.

Therefore either keep all unwrapped function parts Model-first/current-Model, or explicitly identify the original-Model-producing callback form when normalizing parts. The public syntax for accessing the single before-Model snapshot remains an authoring design decision. Do not make a plain shared Step accidentally receive the original Model when it should receive an intermediate Model. This investigation does not apply the rejected contextual-return inference change or claim its inference problem is solved.

### Records and coverage

All record parts handle parent-local facts, never generated child wrappers. Exhaustive records, partial records, and “except” records can lower to the same finite tag-selection recipe. An “except” record still needs exact keys for its supported finite complement if it is meant to require newly added variants to be handled; an implicit wildcard changes that future-variant guarantee.

The full existing update supplies local exhaustiveness, so partial parts do not create a coverage hole. This is another advantage of exactly one full-plan anchor. Overlapping local parts execute sequentially by design; they are not first-match alternatives. A version with no full plan would need a separate aggregate coverage rule and a declared routing position.

### OutMessages

A native result carries at most one OutMessage. Composition cannot silently overwrite an earlier one or drop a child fold's OutMessage. `Update.combineSteps` intentionally rejects emitters for this reason.

A bounded first proof can keep shared stages silent, retain the route's OutMessage, and allow at most one potentially emitting record part for each local tag across the whole composition. A shared stage can be the single emitter if every other applicable part, including the route on child deliveries, is statically silent. More general shared-stage emitters require a correspondingly precise per-dispatch conflict check or an explicit resolution policy. A runtime refusal of a second actual OutMessage is a useful erased-call control, not a substitute for rejecting known conflicting channels statically.

### Context and exact channels

Use one common exact context tuple, normally supplied by the existing full plan and checked against the Definition. Parts must be callable with that tuple; do not concatenate the contexts of successive stages. Preserve optional, default, and rest parameter shapes. Keep the native outer direct/curried adapter and copy recorded observable context metadata instead of reading a wrapper's `length`.

For each local tag, union the requirements/evidence of only the applicable record parts plus common shared parts. Preserve the original tag-specific OutMessage. `block/operationOutputs.ts` already supplies a flat per-tag channel interface; reconstructing everything from a full plan's aggregate `ReturnType` would accidentally include routed or unrelated local channels.

Shared callbacks with an aggregate Command requirement legitimately add that requirement to every dispatch on which they may run. Merely inspecting a Message tag inside an ordinary callback does not establish new per-tag precision. Keep all existing concrete-result, local Command-result, graph-input, registration, and resolved child-policy validation.

The aggregate completed update additionally retains the actual route channels once. Independent contract completion must still reject missing ordinary Services, undeclared handler errors, foreign Binding evidence, and hidden child-policy OutMessages. No new resource-capability or Layer acquisition mechanism is needed.

## Bounded next proof

Before changing public guidance, one source/runtime/emitted fixture should cover:

1. A shared pre-stage, two local record parts around one existing full plan, and a shared post-stage. A real keyed child delivery proves exactly one child update and one parent fold.
2. The same incoming Model/Message through a local dispatch and child dispatch, proving the explicit anchor ordering. Add a pre-stage that affects child route gating or context to expose a route-first implementation accidentally substituted for the chosen semantics.
3. One snapshot comparison spanning a pre-stage, the anchor, and a post-stage; then nest the composed plan and verify flattening still captures the outer original Model once.
4. Connected Steps in pre/local/post positions, where later stages see earlier Models; Command ordering and original Command identity remain intact. No stage producer runs during construction or init.
5. Exactly zero/two full plans, foreign Composition/Definition, forged or spread parts, wrong Model/Command results, foreign graph, erased competing OutMessage, and undeclared Service rejection.
6. Direct/curried calls and required/optional/default/rest context. Source, strict emitted, and physically relocated consumers retain per-tag channels.
7. Purposeful mutations: run the router twice, move routing to the start, pass the original instead of current Model to a stage, recapture the snapshot for a nested plan, lose inner source authentication, replay an earlier stage while resolving a recipe, or drop its requirements/evidence.

Run unchanged compiler ceilings after the named type surface is stable. There is no measured compiler-cost, declaration-portability, or implementation-success claim in this read-only report.

## Bounded runtime prototype follow-up

The original investigation above was read-only. A subsequently authorized isolated runtime prototype now exists in `block/delivery.ts`, with seven focused cases in `block/updateComposition.runtime.test.ts`. It retains the ordinary dispatcher path and records immutable, factory-owned recipes beside it. Both one-full-plan composition (A) and explicit routing with sparse records (B) lower to that interpreter. Nested compositions flatten and retain one outer before-Model frame.

The prototype chose one shared calling convention: `(currentModel, message, { before }, ...context)`. A returned Step is applied once to the same current Model; its passive recipe is resolved before the next stage. No original-Model-producing callback protocol, contextual-return hint change, or archived prototype was used.

Local completeness comes only from actual record stages. `each`, `on`, and `except` are shared updates and cannot mask missing local handlers. A static record-only B composition is checked when composed. A contextual sparse record exposes no runtime tag header without evaluating its factory, so B defers erased-call coverage refusal for that case until an incoming local dispatch. Such factories remain passive and never run for child delivery. This validation-timing difference is a concrete reason to start with A's existing exhaustive full update anchor.

The seven runtime cases cover anchor ordering and child gating at the evolving Model; exactly one route plus passive recipe execution; explicit routing and Message selection; nested original snapshot and Command identity/order; default/rest and required Context through direct/curried calls; foreign/forged/missing/duplicate/incomplete recipes; early wrong-source and unknown-tag rejection; and competing actual OutMessage refusal. The same run passed the 16 existing native delivery cases (23 total). Full core source noEmit passed. These tests use real registered delivery metadata and passive operation recipes; they do not constitute another whole Runtime lifecycle, keyed generation, browser, declaration, or compiler-performance proof. Those broader claims must come from the integrated consumer and gates owned by the lead.

No canonical core/UI build was run by this task. The configured scoped lint attempt could not load the new worktree's absent built Foldkit lint plugin; it is not recorded as a lint pass.
