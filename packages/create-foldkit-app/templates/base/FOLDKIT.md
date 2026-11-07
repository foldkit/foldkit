# Foldkit Conventions

Foldkit owns this file. `create-foldkit-app` writes it and upgrades replace it whole, so anything added here is lost. Project-specific instructions go in `AGENTS.md`.

This is a Foldkit app, a framework built on Effect-TS, architected like Elm.

## Getting the canonical references

The live Foldkit code is the canonical reference for everything: which APIs exist, what idiomatic apps look like, what the current conventions are. Written docs (including this one) can drift; the code can't.

If `./repos/foldkit` exists, it contains the full Foldkit repository, vendored in as a git subtree. Read from it directly:

- `repos/foldkit/examples/`: runnable example apps spanning every complexity tier. Usually your first stop when looking for a precedent for how to write something.
- `repos/foldkit/packages/foldkit/src/`: framework source. Ground truth for API signatures.
- `repos/foldkit/packages/typing-game/client/src/` and `repos/foldkit/packages/website/src/`: production apps built with Foldkit. Highest-fidelity reference for application architecture, Blocks, and OutMessage.

Treat the subtree as read-only reference: never import from `repos/foldkit/` in your project source. Imports must come from the `foldkit` npm package.

If `./repos/foldkit` does not exist and `AGENTS.md` says `subtree_prompted: false`, offer to vendor the repository. It gives you access to the full source, examples, and docs. Pin it to the release git tag matching the installed `foldkit` package; vendoring `main` instead can hand you examples and APIs from a release the project has not installed:

```sh
git subtree add --prefix=repos/foldkit https://github.com/foldkit/foldkit.git "foldkit@$(node -p "require('./node_modules/foldkit/package.json').version")" --squash
```

A canary install has no release tag to pin to. Its version names its source commit (`0.156.0-canary.<commit>`); use the full hash of that commit as the ref instead. GitHub expands the short hash at `https://github.com/foldkit/foldkit/commit/<commit>`.

Whether the user accepts or declines, set that line in `AGENTS.md` to `true` so it isn't asked again.

If `foldkit-skills` is installed as a Claude Code plugin, the `generate-program` and `audit-program` skills carry snapshot architecture and conventions guides synced from the live code.

## After a Foldkit upgrade

Two things go stale when the project upgrades its Foldkit packages: the vendored subtree and this file. Bring both forward, subtree first, since the fresh copy of this file comes from it.

Re-pin the subtree to the newly installed release (for a canary install, pin to the commit its version names, as above):

```sh
git subtree pull --prefix=repos/foldkit https://github.com/foldkit/foldkit.git "foldkit@$(node -p "require('./node_modules/foldkit/package.json').version")" --squash
```

Then replace this file whole. Foldkit's conventions change with its APIs, and a stale copy sends agents after APIs the installed packages no longer export. Copy `repos/foldkit/packages/create-foldkit-app/templates/base/FOLDKIT.md` over this file. Without the subtree, take the template from GitHub at the tag matching the installed version: `https://github.com/foldkit/foldkit/blob/foldkit@<version>/packages/create-foldkit-app/templates/base/FOLDKIT.md`. There is nothing here to merge or preserve.

## Project Conventions

- Declare each concrete Block once as `<Feature>Block = Block.make('Feature', ...)`, such as `SearchBlock` or `ApplicationBlock`. That same passive value exposes its public contracts and typed authoring helpers. Name its Composition `<Feature>Composition`. Export the Block and its ordinary construction `layer`; Program, Server, Story, and Scene receive the pair `{ block: ApplicationBlock, layer }`. A generic UI factory retains `makeBlock`, and its shared implementation provider is `Component.layer`.
- Foldkit is tightly coupled to the Effect ecosystem. Do not suggest solutions outside of Effect-TS.
- Model fields must be Schema types (the model is a schema). Plain TypeScript types are fine elsewhere (function return types, local variables, etc.).
- Use full names like `Message` (not `Msg`), and `withReturnType` (not `as const` or type casting).
- Suffix Model fields containing an `AsyncData` value with `AsyncData`, such as `workspaceAsyncData` or `weatherAsyncData`. A field storing a Query Model is a child Block Model and does not take this suffix.
- Declare every variant together: `defineMessageUnion()` for local Messages and OutMessages, `defineInMessageUnion()` for ordinary Block InMessages, `defineTaggedUnion()` for other domain unions, and `defineRouteUnion()` for Routes.
- Keep constructors on their union: `Message.ClickedSubmit()`, `FetchState.Ok({ data })`, and `ApplicationRoute.Home()`.
- Use `taggedStruct()` only when the variants cannot be declared together, such as a recursive union.
- Push back on any direction that violates Elm Architecture principles: unidirectional data flow, messages as facts (not commands), model as single source of truth, side effects confined to commands. If a prompt suggests mutating state, imperative event handlers, or two-way bindings, flag the issue and propose the idiomatic Foldkit approach.
- Never use `NoOp`. Every message must describe what happened. A command's result message is named from the command, not from the fact it reports, whether or not it carries a payload: `LockScroll` → `CompletedLockScroll`, `DetermineStartTime` → `CompletedDetermineStartTime` (never `DeterminedStartTime`).

## Foldkit Patterns

### Asynchronous data

Use `AsyncData` directly when the owning Block's Messages and Commands participate in application-specific transitions, such as reconciling mutation results or optimistic rollback. Consider experimental `Query.define` when Query should own fetching, retained data, refresh, and stale-response protection. Keep one authoritative collection rather than copying Query data into a second Model field. Parent coordination uses the child's public operations and OutMessages; do not modify a Query Model's internal data to bypass a missing operation.

Experimental Query and KeyedQuery expose independent viewless Block contracts; provide `Query.layer` / `KeyedQuery.layer` for graph construction. Bind them with the parent's `makeRequiredFieldBinding` or `makeOptionalFieldBinding`, according to storage, and include the Binding under `bindings`; use the Binding's `requestReset`, `requestRevalidation`, `requestRevalidationOrLoad`, and `requestLoadIfMissing` operations. The Query value itself retains direct `read` and `run` conveniences. Query preserves Fetch identity, handler completeness, host delegation, constructor errors and Service requirements, request generations, stale-response protection, and cache-key typing through standard Block composition. KeyedQuery entries are cache data inside one child Model, not keyed Block instances. A canonical Query supplies `query.EffectsLayer`; a host-owned Query omits `handler` and retains its original Fetch host contract until `query.provideHandlers(query.toLayer(...))` supplies it.

For age-aware reuse, configure `staleTime` and call the Binding's `requestLoadIfStale(args, nowMillis)` (omit `args` for ordinary Query). Obtain `nowMillis` from Effect Clock through a Command or Subscription Message. Expiry affects reuse without deleting retained display data. KeyedQuery's optional `maxSettledEntries` bounds settled entries by request and completion recency; pending entries are protected. Use `pendingArgs` and targeted `requestCancel` for obsolete requests. Opt into `notifyOnCompletion: true` and handle accepted results through the Binding's OutMessage policy when the parent coordinates further work. Keep URL, debounce, page planning, and provider-specific cooldown policy in the application; derive displayed data from `read` instead of copying it to another canonical cache. Consult the installed Query guide for the cancellation and retention limits.

### State ownership

Keep the canonical domain data with its owner. Give each editor its own baseline, draft, and submission state. A baseline is an intentional historical value; current display data such as comments belongs in view inputs. Use update context (`delivery.toUpdateContext`) for current parent data needed while handling a Message. Use an `informOf*` operation when an external event requires the child to transition, return a Command, or emit an OutMessage. Changing inputs or context does not dispatch a Message. Avoid acknowledgement informs that repeat a transition the child already performed.

Trace a lookup's source and real invalidation paths before asserting that it exists. Validate external inputs at their boundary. If current parent data can be absent, represent that absence in context and handle it only where the transition needs the data; unrelated editing, closing and pending completions should still work. Do not hide a throw in another helper, fabricate a fallback entity, or discard every child Message through a delivery gate. Keep necessary checks for unknown URL entities, loading, failures, optimistic rollback and stale asynchronous results.

A child may expose a pure read-only selector such as `isComplete` through its explicit barrel. The parent passes the child Model to that accessor; the child owns interpreting its fields. Keep substantial selectors with their responsibility, such as `validation.ts`, rather than exporting them from update. Do not copy derived values into parent state or introduce Messages solely to read them.

Build around the application's requirements and normal user workflows, including reasonable failure and retry behavior. Introduce abstractions for concrete repeated responsibilities; unusual event combinations do not by themselves justify additional framework APIs or application orchestration.

Independent interactions need independent pending and failure state. A project save should not block an unrelated issue move or share feedback that a background response can clear. Keep exclusivity explicit when operations really must serialize.

For a multi-state flow whose legal transitions need real tracing, consider experimental `Machine`. Bind its Schemas once with `Machine.makeDefinition({ State, Message, Context? })`, destructure the Definition helpers, and finish the checked transition table with `makeMachine`. Machine Context is read-only input, not stored state; there is no Composition stage. See the [Machine guide](https://foldkit.dev/core/machine) and `repos/foldkit/examples/state-machine/` for the complete pattern.

Decide what navigation does to unfinished work. Repeated URL delivery or a refresh should not silently replace a dirty draft. Retaining a keyed editor lets its draft and pending save survive navigation. Removing its occurrence ends its lifecycle and invalidates later delivery; keep the owner present when its result must still update the application. Apply mutation results to the data that operation owns, so a delayed response cannot replace unrelated newer state.

### Update

Author init, update, and the canonical view through the same named Composition. The default update uses one exhaustive local handler record. Each case receives the contextual Model and its exact Message; registered child envelopes route through their Bindings instead of local handlers:

```ts
const update = ApplicationComposition.makeUpdate({
  ClickedIncrement: model => ({
    model: modifyFields(model, { count: count => count + 1 }),
  }),
})
```

Use `makeUpdate({})` when there are no local Messages. Use `makeUpdate.withContext(context => cases)` for extra dispatch arguments. The factory runs for local dispatch, not routed child-only delivery. Keep purposeful parameter types for operation inputs and context; let owned callbacks infer Model, Message, returns, and Command requirements. Do not hide inference failures with casts or broad return annotations.

Return ordinary handler results directly. Use Step helpers for reusable transitions, sequencing, OutMessage policies, or useful specialized shorthand; do not wrap every handler in `makeStep`. Name an extracted single-Message handler `handle<MessageTag>` and pass it directly when its signature fits. Name application-authored Step values and factories for their operation: `clearSearch`, `changeSearchQuery(query)`, and `applyDomainResult(result)`. Their definitions and types establish the Step role; omit the `make` prefix and `Step` suffix from these application names. Preserve framework helpers and types such as `makeStep`, `makeFieldsStep`, `makeCommandsStep`, `makeOutMessageStep`, `makeNoopStep`, `Update.Step`, and `Update.combineSteps`, along with other public framework helpers whose names include `Step`. Keep existing naming conventions for unrelated factories, Commands, Messages, Bindings, OutMessage folds and matchers, dedicated `handle<MessageTag>` handlers, public operation keys, and applied update-like results. An existing compatible Model-first Step can be the record value, such as `ClickedOpenSearch: SearchBinding.requestOpen()` or `CompletedSave: makeNoopStep()`. Keep a callback when it adapts payloads, reads Model-dependent arguments, defers argument construction, supplies context, or is needed for contextual inference.

In a split feature, `block.ts` exports the Step helpers used by its implementation, such as `export const { makeStep, makeFieldsStep, makeNoopStep } = FeatureBlock`. Import those helpers by name in `update.ts`, policy modules, and other implementation files. A compact feature destructures them beside its Block declaration in the scope that uses them. Keep Block-qualified calls when a module works with several Blocks and the qualifier identifies the owner. Keep authoring helpers out of the feature barrel; export the passive Block contract and construction `layer` there.

If one handler mixes connected Binding recipes with local results, author its local branches through Block-owned Steps. A raw `{ model }` beside a connected recipe is rejected because it can erase channels. Ordinary raw-only handlers need no Step wrapper.

After graph acquisition the update is dual: `update(model, message, ...context)` and `update(message)(model, ...context)`. The curried form is an internal Step. Record-authored updates retain each selected Message's Command and OutMessage contract; utilities inspecting the whole update retain their union. Extracted helpers must preserve those channels too. Avoid a fixed `Update.Return<Model, Message>` annotation on a Command-producing handler: its default requirement is `never`.

Use `modifyFields` from `foldkit/struct` for immutable Model updates, including nested updates. Never spread or `Object.assign` an existing Model. Keep an update-like result together under an operation name such as `homeInit` or `dialogClose`, then access its fields. Do not destructure or rename `model`, `commands`, or `outMessage`. Pass optional Commands directly to APIs that accept them, such as `Command.mapMessages`; use `commands ?? []` only when a concrete array is required.

Omit `commands` when a producer statically creates none. Return a computed collection directly, even when empty. Never write a literal `commands: []`. A Boolean-conditioned Command group uses `Array.filter(commands, () => condition)`. Actual optional absence still uses `Option`.

### Steps

Choose the helper for the result the Step produces:

| Result                                                                                      | Helper                                              |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Own Model field changes                                                                     | `FeatureBlock.makeFieldsStep(model => transforms)`  |
| Unchanged Model                                                                             | `FeatureBlock.makeNoopStep()`                       |
| Commands with unchanged Model                                                               | `FeatureBlock.makeCommandsStep(model => commands)`  |
| One declared OutMessage with unchanged Model                                                | `FeatureBlock.makeOutMessageStep(() => outMessage)` |
| Conditional or composed results, initialization, connected operations, or combined channels | `FeatureBlock.makeStep(model => result)`            |

All three focused helpers take producer callbacks. An ordinary producer receives the current Model and, in a Message-dependent handler, its exact Message. Use `.fromMessage(message => value)` for payload-only producers and `() => value` for fixed producers. Pass the returned compatible Step or handler directly to `makeUpdate`; keep cohesive mixed transitions as direct results.

Use `makeStep.fromMessage(message => stepOrResult)` when the Message selects or constructs a composed Step or initialization recipe without reading the Model. Inline handler records infer the exact Message variant; extracted producers need a precise variant parameter annotation. The returned handler receives `(model, message)`, evaluates the producer on application, and passes the incoming Model to a returned Step. Keep ordinary `makeStep` for Model-aware producers and additional operation arguments. Close over dispatch context through `makeUpdate.withContext`. An inline Model-aware `makeStep` callback also infers the exact Message from its `makeUpdate` entry, including `.withContext` records. Extracted producers and additional operation arguments retain their precise parameter contracts.

Step construction is passive. Producers run when applied. Commands-only and OutMessage-only helpers preserve the same Model object. Runtime executes effects later. An extracted Message-dependent producer needs a precise Message variant parameter when no surrounding handler record supplies it. Map payloads explicitly when constructing a different Message or OutMessage; do not forward its incoming `_tag` through a constructor reference.

Inside a local `makeStep` callback, return results directly, including `{ model }` for an unchanged Model. Do not construct and immediately apply another local Step merely to express a branch. Keep reusable operations, sequential composition, and canonical local Steps required by mixed connected recipes. An empty `makeFieldsStep` record preserves Model identity. For a helper that gates editing, a Model-to-Model callback keeps `modifyFields` validation at the call site without duplicating generic machinery. `FieldTransforms<Model>` is a structural convenience type, not an exact-key or union-variant validator.

Use `Update.combineSteps` to apply Steps sequentially to the preceding Step's Model. Call a single Step directly. Name an inline parameter `stepModel`. Commands join one batch; their collection order does not sequence completion. The combinator rejects OutMessage-producing Steps. Include an already-known OutMessage directly in a new result, or attach one to an existing plain result with `Update.withOutMessage`. The latter cannot recover an OutMessage discarded upstream.

### Blocks and Bindings

Name field-backed Bindings after their Model field in PascalCase with the `Binding` suffix: `activeMemberListbox` becomes `ActiveMemberListboxBinding`, and `issueDetails` becomes `IssueDetailsBinding`. Preserve optional prefixes, plurals, and role words. For wrapped storage, include the nested child role when the container alone would hide it, such as `entries[].animation` becoming `EntriesAnimationBinding`. Custom and whole-variant storage use a meaningful relationship name. A necessary private pre-policy value uses `Base<Field>Binding`; the policy-complete value keeps the canonical field name.

Declare an independent public contract before its implementation. `Block.make` binds a stable module-level unique `key`, Model, local Message, optional OutMessage, and an `InitArgs` tuple. Add a `Context` tuple for dispatch context, `ChildInitContext` for deferred child startup, and a `view` descriptor when the Block renders. A serializable tuple uses `Schema.Tuple`; callbacks or other deliberately nonserialized inputs use `Block.makeInputContract<...>()`.

Export the same `FooBlock` declaration for parent authorship. Parents derive Schemas from `FooBlock.Model`, configure Bindings, author extracted Steps, and render through their Composition without importing the child implementation. The key identifies the contract; the readable Block name is a label and may repeat across independent modules. Declare one unique key at module scope. When verified declaration emission needs a Block’s unique-symbol identity, export its original key declaration from the owning module. A public barrel may re-export it with `export type` when downstream declarations only need to name that identity.

A Block feature's explicit barrel exposes its passive Block, construction `layer`, stable read-only queries, and necessary public Schema/type contracts. A pure selector such as `isComplete(model)` or `hasErrors(model)` lets the child own interpreting its Model while the parent reads the result. Put substantial selectors beside their responsibility, such as `validation.ts`, and export them deliberately. Ordinary selector exports are independent of implementation Layer selection, so give them stable semantics over the public Model. Keep authoring helpers and update implementations internal. Do not store duplicate derived state or add Messages solely to read it.

Complete the ordinary implementation with `FooBlock.makeLayer({ init, update, view, ... })`. Init's Composition selects the exact registered Binding inventory, which Foldkit acquires automatically without a `children` field or Effect wrapper. Keep init, update, view and other portable plans on the same graph. Provide child implementations separately with ordinary Layer composition: `FooBlock.makeLayer(...).pipe(Layer.provide(Child.layer))`. A feature barrel exports the passive `FooBlock` and the implementation `layer`; the root exports the same `ApplicationBlock` declaration and its `layer` for paired Program or Server hosting.

Use `FooBlock.makeLayer(Effect.gen(...))` only when graph construction has genuine dependencies, scoped resources, or needs acquired handles. That form remains explicit: yield individual Bindings when their handles are used, or optionally call `FooComposition.acquireChildren()` for the complete registered inventory, then return `children` with the portable implementation. It never mixes automatic acquisition with that explicit result; `children` is the complete selected inventory. A childless custom constructor returns `children: []`. Neither form initializes child Models, evaluates init arguments, builds handlers, or starts lifecycles.

Write each Block implementation field on its own line, including records passed to `makeLayer`, even when the record would fit on one line. In a custom Effect constructor, leave one blank line between the Binding acquisition group and `return`. Use the same field layout for childless Blocks.

Inline single-use `bindings` at their registration sites. Export one policy-complete Binding for each relationship. In the exceptional custom Effect constructor, inline a single-use `children` array and acquire the same Binding only when construction uses its handle. Keep a necessary base Binding internal when reciprocal policies or self-directed operations need to break a dependency cycle. A Binding registers the relationship to a child contract; the supplied child Layer constructs its implementation.

The public contract is bounded independently of the implementation graph. Ordinary app code needs no preparation producer, assembly annotation, generic graph reconstruction, casts or `satisfies`. Check real emitted entrypoints and relocated consumers when changing published types. Generic library factories may retain their existing named `Completed` interfaces and a narrow library-owned refinement for type-only payloads; application callers keep `Component.makeBlock<Item>()` and provide `Component.layer`.

Construction builds the executable graph once in its Layer scope. It does not run init, evaluate `init.contextToArgs`, create Model occurrences, build handler Layers, run Commands or start Subscription/ManagedResource/Mount lifecycles. Acquired init, update and operations remain synchronous pure functions. Ordinary Service requirements for requests belong in their attached handler constructors. Use the Block constructor for graph construction and implementation dependencies it actually needs; keep all application workflow state in the Model.

Use a Block when a feature owns interaction state, effects, or lifecycle. Pure domain functions and render-only helpers remain ordinary functions. When related contracts share owned effect definitions, create `FeatureNamespace = Block.makeNamespace('Feature')` once at module scope and pass it to `Block.make(FeatureNamespace, contracts)`. Generic component libraries with a shared implementation provider use Foldkit’s internal library-authoring mechanism; ordinary application Blocks need no family machinery. Create an ordinary feature’s Block once at module scope.

The root follows the same pattern and exports `ApplicationBlock` and `layer`. `Program.make` or `Program.makeElement` receives that pair and adds the container, routing, Flags, and host configuration. Provide ordinary Services through `program.provide(ApplicationLayer)`; Runtime and Server hosts, or explicit scoped test acquisition, own graph execution.

The parent declares a storage-specific Binding against the child contract, such as `ParentBlock.makeRequiredFieldBinding(ChildBlock, { field })`. Register that Binding in its Composition's `bindings`. Ordinary `makeLayer({ init, update, view, ... })` completion acquires init's registered inventory; provide each child implementation Layer separately. Acquired connections preserve handler and lifecycle ownership. The passive child contract exposes local Message constructors; the acquired executable's Message Codec adds generated envelopes for actual child connections. Use that acquired Codec for external dispatch and serialization. Do not author `Got*` wrappers or Message mappers, inspect internal child Message tags in parent update, or update child fields directly.

Choose storage from the parent Schema:

- `makeRequiredFieldBinding(ChildBlock, { field })` selects one required field with exactly the child Model's decoded shape.
- `makeOptionalFieldBinding(ChildBlock, { field })` selects a required `Option<ChildModel>` field. `None` means absent; ordinary operations never create it. Both direct-field forms support `activeWhen`, which deactivates the whole occurrence while retaining its stored Model. `delivery.when` gates incoming child Messages, and `subscriptions.when` gates only Streams.
- `makeOptionalKeyedFieldBinding(ChildBlock, { field, key, childField })` selects one closed Option wrapper containing a stable key and child Model. The parent owns creation through `Binding.init`; this form has no startup `init` policy.
- `makeKeyedArrayBinding(ChildBlock, { field, key })` selects an array whose child Models have a declared stable string or finite-number identity field. Closed wrapper arrays also specify `childField`. A standard `Schema.Array(ChildBlock.Instance)` uses `{ field, key: 'key', childField: 'model' }`; each ready Instance stores its string key and child Model.
- `makeRecordBinding(ChildBlock, { field })` and `makeHashMapBinding(ChildBlock, { field })` select their respective required containers. Add `childField` for a closed wrapper around each child Model. The parent Schema supplies the exact key contract. Preserve a separate ordered ID list when order matters.
- `makeCustomBinding` takes `read` and `write` for custom unkeyed storage. `makeCustomKeyedBinding` takes `readAll`, function `key`, `read`, and `writeAt` for custom keyed storage. A Message-bearing child also requires an exact `keySchema`; a Message-free child omits it because it has no delivery envelope.
- `makeVariantBinding(ChildBlock)` selects one complete tagged child member of the parent `Schema.Union`. Include the actual child Model Schema in that union. Parent update owns variant switches.

All constructors belong to the parent Block. A split feature can export the needed destructured constructors from its `block.ts` and import them from that owning module. Extraction preserves the parent contracts. Storage selection does not add activity predicates to keyed, map, custom or variant forms; custom readers already express absence.

Placement identifies a relationship in the graph. Direct and map fields default it to their field; keyed arrays, keyed Options, and static accessors default to the child Block ID. The occurrence key identifies one child within a keyed relationship. Override placement only for a sibling collision or deliberate stable identity.

A writer places the next child Model into its storage, preserving wrapper metadata and respecting absence and key identity. Parent reactions belong in OutMessage policy. If a required fact is missing, add a truthful child OutMessage instead of using the writer as an event hook. Use `delivery.when` for admission and `delivery.toUpdateContext` for exact update context; keyed policies receive the occurrence key. Message-free children (`Schema.Never`) need no delivery policy.

For ordinary parent requests and notifications, declare the optional `InMessage` with `defineInMessageUnion()`, separate from local `Message` and OutMessage unions declared with `defineMessageUnion()`. The helper rejects names outside `Requested...` and `InformedOf...`, including empty suffixes, at each literal property and again at runtime for erased inputs. Extracted literal case records stay valid. It returns the ordinary MessageUnion surface and adds no brand; other Schema forms remain supported subject to Block's existing constructor and tag validation. `RequestedSubmit` generates `Binding.requestSubmit()`, and `InformedOfIssueChanged` generates `Binding.informOfIssueChanged(payload)`. Payload fields retain the constructor's exact input; keyed Bindings take the occurrence key first. Author an exhaustive `Composition.makeInMessageUpdate` record and include `inMessageUpdate` in the implementation record. A shared Step in `steps.ts` can serve both a local `SubmittedForm` handler and a received `RequestedSubmit` handler.

Declare InMessage context separately with `InMessageContext` and `makeInMessageUpdate.withContext`; Binding methods take that tuple after the payload. `Context` and `delivery.toUpdateContext` still belong to update. Sparse `inMessageOutputs` entries declare OutMessage and extra `services` or `managedResources` bounds; omitted entries are silent and add no public requirements. InMessage handling is synchronous and pure, and any Commands still produce local Messages for update. Construction, Model ownership, and occurrence lifecycles stay unchanged. Scoped tests use `Story.inMessage` / `Scene.inMessage`, with `{ block, layer, inMessageContext: [...] }` when required.

Keep explicit Block `operations` for positional or generic adapters, defaults, refinements, and existing local-Message mappings. A Message constructor or `{ message, outMessage }` declares a direct mapping; a tuple producer returns `[Message, ...context]`. These operations still enter update synchronously. Avoid `reflect*` helpers that bypass the owning transition to change child state.

Connected Binding operations require the registered graph. Apply them in Composition-authored init/update or return them through the parent's `makeStep`; preserve opaque results intact. They expose no useful `.model` or `.commands` before checked execution. The Composition resolves their final channels. An acquired executable's `operations.name(model, ...args)` accepts the child's raw Model and returns an executed result; ordinary pure Steps also remain callable. TypeScript can erase a connected function's result through `void`, but outside the graph that call only constructs and discards passive configuration.

Use `makeUpdate({})` when the Block has no local Messages. A leaf whose complete dispatch contract is empty declares `isMessageFree: true` with `Schema.Never` or an empty Message union. A routed-only parent keeps the empty local union and omits that flag because its child deliveries make the complete dispatch contract nonempty. Do not invent a local Message.

### OutMessage policies

Select every child OutMessage policy with `withOutMessagePolicy`. Keep folds callable and author both inline and extracted folds through `ParentBlock.makeOutMessageFold(ChildBlock, cases)`, always passing the passive child contract explicitly. Name every variant, including singleton unions. The helper contextually types payloads and preserves inferred requirements and registration evidence. Do not substitute a raw child matcher or repetitive generic annotations. Take the inferred `FoldContext` argument only when using its lifters or previous Model.

Inline a single-use fold beside its Binding by default. Extract it when reused or when the mapping substantially obscures the relationship. For a complicated branch, first extract the transition and leave the exhaustive tag-to-response mapping inline. Keep explicit no-op cases: the child still updates, and the case records the parent's deliberate response to that variant.

For keyed Bindings, pass that fold directly when its handlers do not need the key. Otherwise use `fold: key => makeOutMessageFold(ChildBlock, cases)`, closing over the inferred occurrence key. The Binding supplies the OutMessage and FoldContext to the produced fold during delivery. Pass a compatible extracted fold factory directly; retain a callback when it defers a declaration read or adapts inputs. Producers stay passive until an existing occurrence emits, and parent Steps run after the child write. Use the explicit `(key, outMessage, context) => step` form when the adaptation needs those inputs together. Only authored `makeOutMessageFold` helpers support the returned-fold form; do not substitute an unregistered matcher.

Keep ordinary policies fluent. For self-referential or reciprocal coordination, declare the operation-bearing Bindings first, then their folds and selected `FooBindingWithOutMessagePolicy` values. Register the selected values. Keep mutually coordinating policies together and defer sibling calls through callbacks to avoid initialization and import cycles.

Include `forward` only when at least one child variant continues to this Block's parent. Author it with `makeOutMessageForward`, passing the child explicitly when extracted or adapted for keyed policy. Name every variant and return `undefined` for those that stop. Local `fold` policy still runs for forwarded variants; a derived parent OutMessage takes precedence over one-to-one forwarding. A no-op fold branch is point-free `Closed: makeNoopStep`; an update-record no-op calls the factory: `CompletedFocus: makeNoopStep()`.

### Child initialization

Keep child state retention, rendering, and activity as separate decisions. A Route change can select another view while retaining child Models in the parent. Store multiple retained editors by entity identity when navigating A to B to A should preserve both. A retained occurrence can still receive pending results; gate its Subscriptions or other activity explicitly when necessary. Remove child state for an application reason such as deletion or eviction. Use `init...IfMissing` for application Steps that preserve an existing occurrence and initialize only an absent identity.

Declare the current Block's `InitArgs` tuple once and author one `Composition.makeInit`; its callback receives contextual startup inputs. Optional, default and rest input contracts must match that declared tuple. Defer child initialization until this plan is applied. Return parent-owned fields under `model`, optional root `commands`, and `steps` for transitions after child fields exist. An optional Block `ChildInitContext` Schema describes shared data produced by parent init; each child's `init.contextToArgs` selects initializer arguments from that context. Return the value as `childInitContext`. It does not describe the parent's own init arguments.

For a required direct child whose initializer accepts no arguments, omit `init` for automatic initialization. Required inputs use `init.contextToArgs`; `init: false` makes the parent supply the field. Optional, keyed, and accessor storage remains parent-owned when `init` is omitted. An optional direct field's selector returns `Option<tuple>`. Keyed arrays use `init.instances` returning ordered `{ key, args }` records. Omit `init.toItem` for exact direct child Models; wrapped storage or parent metadata requires an explicit adapter. Custom accessors can use `init.toParentFields`. Preserve the planned key and exact initialized child Model inside plain wrapper records.

Composition initializes selected children once in Binding order, then applies startup Steps. Parent Commands precede retained child init Commands; startup Step Commands follow. Commands are a batch, with no asynchronous completion-order guarantee. Init Commands for absent children are filtered out. Use existing meaningful operations in startup Steps; do not invent a separate boot phase or a Message solely for startup when init can accept the inputs.

Dynamic creation or deliberate replacement returns `Binding.init({ key?, args, toParentModel })` intact from Composition-owned authoring. It is a passive, noncallable recipe with no `.model` or `.commands`. Reinitializing an existing occurrence does not create a fresh generation or cancel pending work; lifecycle-sensitive resets belong in a child operation.

For a required top-level `Schema.Array(ChildBlock.Instance)` field, the owning `makeFieldsStep` can append `Binding.create({ key, args })` alongside other parent field changes. `create` passively captures the key and exact child init tuple. Checked execution initializes each request before the next Step, places the ready `{ key, model }` Instance, and retains child init Commands, exact requirements, and registration evidence. Startup can begin with an empty array and reuse that same transition in `makeInit`'s `steps`.

Creation-bearing field results are opaque connected recipes until execution; preserve them intact through the registered Composition. Plain field changes remain readable Model-only results. Requests cannot substitute for ready Instances in `Model.make` or `modifyFields`. Seed prebuilt fixtures with `ChildBlock.Instance.make({ key, model })`; decoding a ready snapshot does not rerun init. Creation rejects duplicate or existing keys. Remove ready Instances through ordinary field transforms; existing occurrence cleanup still applies. This API covers standard string-keyed arrays. Keep the existing initialization paths for Option fields, maps, custom wrapper metadata, and arrays whose child Model owns its ID.

Use the optional `foldkit/binding` helpers when initialization only places the child in declared storage. Pass the Binding, current parent Model, and `{ args }`, adding `key` for keyed storage:

- `initAndSet` replaces a required or optional direct field, or a keyed Option wrapper containing only its key and child fields. Direct storage needs no startup policy. A custom unkeyed accessor can reuse its existing `init.toParentFields` projection.
- `initAndAppend` appends an absent keyed array occurrence using an existing startup `init.instances` policy and its direct-storage default or explicit `init.toItem`.
- `initAndInsert` inserts an absent Record/HashMap key when `makeRecordBinding` or `makeHashMapBinding` stores child Models directly.

All return passive recipes retaining child init Commands and registration requirements. Append and insert reject existing keys. Keep explicit `Binding.init` for additional wrapper metadata, sibling changes, parent Commands, custom storage without a projection, array/map replacement, or a whole tagged variant. Do not add an unnecessary startup policy for a helper. Same-key reinitialization does not establish a fresh generation or cancel pending work.

For Record/HashMap fields storing child Models directly, use `makeInitIfMissingStep` from the same module when existing children should be retained. `makeInitIfMissingStep(Binding, { key, args })` snapshots a static selection at construction. When selection depends on the current Model, pass a pure producer returning `Option.some({ key, args })` or `Option.none()`; the Binding contextually supplies the exact parent Model, key and init arguments. Construction remains passive, and the registered graph evaluates the producer exactly once during Step interpretation with the current Step Model. `None` and an existing key preserve the exact Model, emit no Commands and do not run child init; a missing selected key inserts the child with its init Commands. Every branch requires the original Binding. Pass the Step directly to `Update.combineSteps` or a compatible handler; use the owning `makeStep` when selecting or composing Steps. Keep entity lookup and handling of unknown URL IDs in the application. Both forms support only direct-value storage; wrappers, custom metadata and parent Commands keep explicit `Binding.init`.

### Routing

Parse the initial URL in init and later URLs in the `ChangedUrl` handler, then store a typed `ApplicationRoute` in the Model. Use `Route.parseUrlWithFallback` for a full `Url` and `Route.parsePathWithFallback` for an origin-relative path, including query parameters.

When a query value represents a Route or another domain value, decode it through a Schema transformation passed to `Route.query`. Keep the application Route Schema plain so Model serialization carries the decoded value. Encode the value back to a string when building the URL. Rendering and selectors use the typed value directly.

### View

Every view receives `h`, the typed Html builder, as its last parameter. Define the canonical view through its owning Composition's `makeView` or `makeView.withInputs`. Alternate rendering must preserve the declared input and graph capability contract. Ordinary extracted helpers are plain functions. After establishing `FeatureComposition`, declare `type FeatureViewBuilder = Block.ViewBuilderFor<typeof FeatureComposition>` on the next line with no blank line and use that alias for feature-local helpers. Export it only when another file uses it. It retains the feature Message type and registered child and Mount capabilities without constructing a runtime builder. The owner prefix is deliberate even though internal structural contracts remain `Model`, `Message`, and `OutMessage`: the passive `FeatureBlock` exposes those public contracts, while the builder alias identifies one Composition's capabilities at a plain type import site. Let the primary Block view receive its own Model. A cohesive page, form, or tab composer may keep that Model when it coordinates most of the same state. Smaller helpers take the fields, derived domain values, or child Models they render, followed by `h`. A selector call does not justify giving a leaf helper the whole Model; pass the selector result when that is the value it renders. Do not introduce a ViewModel merely to bundle slices for these helpers. Let TypeScript infer whether a helper returns one `Html` value or an array. Rendering genuinely shared across owners takes the framework's general `HtmlBuilder<Message>` form, with capability requirements when needed. Never annotate the primary view's inferred `h` parameter. Never construct a builder; reach for `h.div`, `h.OnClick`, and other helpers from the parameter. Only where no builder is in scope, typically module scope, use `inertHtml` from `foldkit/html`, aliased `ih`. Use `h.empty` (not `null`) for conditional rendering, the union's own exhaustive `match` for discriminated unions, and `Array.match` for lists that may be empty.

Key mapped list items and entity slots by stable identity: key each row by a stable Model identifier (`h.keyed('li')(item.id, [], [...])`), never by array position, and never derive a key from displayed data. Key an entity slot by entity ID when its identity changes at the same position. Never key branches; the build gives each view function's output its own identity, so branch switches replace DOM automatically. When switching an inline same-tag ternary must reset DOM state, extract each arm into its own named view function.

Omit the children argument when an element has none: `h.div([h.Class('divider')])`, never `h.div([h.Class('divider')], [])`. The same holds for `keyed`: `h.keyed('li')(key, [attrs])`, never `h.keyed('li')(key, [attrs], [])`. Attributes stay required on element builders, so `h.div([])` is an element with neither. Sibling elements that end up at different arities are expected and fine; void elements like `h.img` have always read that way.

### Commands

Define a Command with `FeatureBlock.makeCommand(name, { args, messages, handler })`; omit `args` when it takes none. Assign definitions to PascalCase constants. Keep the handler Layer beside its definition. Name the work the handler performs, not the later Model transition caused by its result: a timer that waits before update begins dismissal is `WaitBeforeDismissal`. Convert expected failures to result Messages with `Effect.catch(() => Effect.succeed(Message.FailedX(...)))`. Defects follow the application's crash handling. Commands belong beside the update that returns them.

`handler` is a generator constructor. Foldkit applies `Effect.gen` once per Runtime start; capture stable Services there and return the invocation function. Requests, delays, time reads, and DOM operations happen inside that returned function with current args. A constructor needing no setup still returns the function directly. Omit `handler` only for an external host contract; provide its implementation Effect constructor through the original definition's `toLayer`. Include that provider in local `EffectsLayer`, or list the original definition under the implementation's `hostHandlers` and select it with `layer.pipe(FeatureBlock.provideHandlers(HandlersLayer))` before hosting or scoped tests. Every selected Layer alternative must cover the original handlers and fit the Block's declared Service and constructor-error bounds. Selection is passive and independent of child construction provisioning. Pure Stories do not build handler Layers.

Compose attached `.layer` recipes in the feature's local `EffectsLayer`, including its Command, Subscription, Mount, and ManagedResource handlers. Registered child Bindings contribute their own recipes. `ApplicationLayer` supplies the remaining ordinary Services. Reserve `Layer` for Effect's module; create a standalone `<DefinitionName>Layer` only when that individual provider is independently public or reused, and name alternatives `<DefinitionName>TestLayer`. Ordinary execution tests retain the production handler Layer and replace the Services beneath it.

Command args contain values already in the Model or Message. Read time, randomness, and UUIDs inside the invocation Effect and return them in result Messages. Use `Dom` for browser operations and Effect's `Clock`, `Random`, and `Effect.sleep`. For UUIDs and cryptographic randomness, import `SecureRandom` from `effect/crypto`, capture `SecureRandom.SecureRandom` in the handler constructor, and call its `uuidV4()` inside the invocation Effect. Provide `BrowserCrypto.layerSecureRandom` from `@effect/platform-browser` at the application root. Avoid raw `document.querySelector`, `setTimeout`, `Date.now()`, or `Math.random()` in app transitions.

For with-args handlers, see `repos/foldkit/examples/weather/src/command.ts` or `repos/foldkit/examples/kanban/src/command.ts`; `FocusAddCardInput` in Kanban demonstrates an argless DOM Command.

### Lifecycle effects

Create one `FeatureBlock.makeSubscriptions(...)` registry for all Subscriptions owned by a Block. Add entries to that record and extract substantial Stream implementations into helpers instead of creating another registry for the same owner. Distinct child Blocks retain their own registries. Subscriptions declare `messages`, their Model projection, and `handler` in the entry config. The handler generator returns a function from dependencies to a Stream. When every owned entry has an attached handler, include `subscriptions.layer` in the feature's `EffectsLayer`. When Subscription declarations are split from Block assembly, that module exports the Block's one registry; compose `Feature.subscriptions.layer` directly in `effectsLayer.ts`. When the registry supplies the complete local handler bundle, pass `EffectsLayer: subscriptions.layer` directly in the Block implementation record. The registry Layer is a passive recipe, is `Layer.empty` for an empty record, and is unavailable for mixed host ownership. The entry key `layer` is reserved. Individual entry recipes remain available for intentionally selective assembly. Use `Subscription.aggregate` only at graph, adapter, or test boundaries that join independent records. The Message declaration limits what that Stream can emit; use `messages: []` for silent scoped work. The generator runs once for a runtime start. Restarting the Subscription reuses that factory and its application-lifetime providers. A host-owned entry may omit `handler` and receive its implementation through `toLayer`, which accepts the implementation Effect constructor.

Before choosing a ManagedResource, identify the Command or other consumer that needs its handle. Model-gated listeners or scoped work with no handle consumer belong in a Subscription, including `messages: []` when they emit nothing. Installing a listener and removing it on cleanup is not enough reason to create a ManagedResource. Use a Mount when one rendered element owns the work. See [lifecycle ownership](https://foldkit.dev/core/subscriptions#lifecycle-ownership) for the decision rules.

Mounts use the same `config.handler` generator and `.layer` convention. The returned operation receives the live element; perform DOM work there. Include the definition in its owning Composition's `mounts`. Publish it under the Definition's `view.mounts` only when its capability deliberately leaves through view callbacks or attributes. A ManagedResource entry likewise stores a handler generator in its config. The generator returns an object with required `acquire` and `release` functions. Supply cleanup explicitly. A no-op release is appropriate when scoped acquisition already registered the real finalizers, as with `Layer.build`. Foldkit finishes explicit release and scoped cleanup before clearing the handle and emitting `onReleased`.

An owned `FeatureBlock.makeManagedResources(...)` registry exposes `managedResources.layer` only when every entry has an attached handler. Empty registries provide `Layer.empty`; mixed or host-owned registries require explicit entry providers. The registry key `layer` is reserved, matching Subscriptions. Merge the aggregate into local `EffectsLayer`; construction remains passive.

Keep the four lifetimes distinct. Application services such as RPC clients last for one Runtime start. A Command Effect lasts for one dispatch. Subscription Streams and ManagedResource handles follow Model conditions. Mount acquisition follows one DOM element. A handler generator may capture a stable service or accessor. It must not capture current time, Command args, Subscription dependencies, a DOM element, or an active ManagedResource handle. Captured services remain fixed for the Runtime start. Contextual lookups use the merged invocation context, where invocation services win. Looking up a service retrieves a provided instance; it does not construct the provider.

Handlers and services may own mutable execution bookkeeping, such as worker availability or protocol request IDs. The Model and update own pending work shown to the user, selections, and submission rules. A `Ref` created in the constructor must not become the source of truth for workflow decisions or state read by view.

### File organization

Import each file's Foldkit UI components through one named root import, such as `import { Button, Combobox, Listbox } from '@foldkit/ui'`. Qualify the entire public component surface through its owning namespace: `Button.view`, `Listbox.makeBlock`, `Combobox.Multi`, `Listbox.layer`, `Listbox.RenderInfo`, and `Listbox.test`. Do not import UI component subpaths or alias individual UI exports. If a component namespace collides with another required binding, alias that namespace once at import time, such as `Calendar as UiCalendar`.

Listbox and Combobox are Schema-backed selection families, unlike Menu, RadioGroup, Tabs, and other type-parameter factories. Construct Combobox with its Item Schema. Construct Listbox and `Listbox.Multi` with zero Schemas for plain strings, one Value Schema when items are values directly, or an Item Schema and Value Schema for richer view items. The Listbox Value Schema validates selected Messages and OutMessages at runtime. Its Item Schema is only a view-input witness and adds no serialization or Service requirements. Omit `itemToValue` only when the actual items also satisfy the Value Schema; otherwise extract the Value explicitly. There is no type-argument-only Listbox compatibility form.

When a feature's view needs subdivisions, keep its entry composer in `view/view.ts` and use an explicit `view/index.ts` barrel. Place route, page, and demo render fragments beneath `view/`; keep the Model, Message, contracts, init, update, and other non-rendering feature responsibilities outside that directory.

Keep a Step used by only one responsibility with that code. Put reusable Steps shared by update, composition, or init in the owning Block's `steps.ts`. For a larger module, use responsibility files such as `steps/search.ts` and `steps/quoteLoading.ts`, with an explicit `steps/index.ts` barrel. The owner is the Block whose Model the Step transforms. Keep shared Steps independent of the owning update and selected implementation.

`update.ts` maps local Messages to handlers and Steps. Optional `inMessageUpdate.ts` maps InMessages to handlers and Steps. `composition.ts` registers relationships and maps child OutMessages to parent Steps. `steps.ts` owns the reusable transitions those entry points share. Keep Binding registration and OutMessage policy in composition. Name shared transitions for their operation, without a `make` prefix or `Step` suffix. A Step that closes over a Binding from composition must read it in a deferred producer when the modules depend on one another; module initialization must not invoke that Binding.

When using Tailwind, keep reusable static control recipes in the stylesheet's `@layer components`, where ordinary utilities can override them. Use `@utility` when adding an actual utility that needs variants. Keep `clsx` for conditional classes. Avoid a TypeScript module whose only job is assembling and exporting static class strings.

Keep a Block's child Block folders under its own `blocks/` directory, separate from domain and helper folders. Name each child folder after its passive Block contract in camelCase: an application's `IssueBoardBlock` lives in `src/blocks/issueBoard/`, and IssueDetail's CommentComposer lives in `issueDetail/blocks/commentComposer/`. Each `blocks/index.ts` explicitly exports its child namespaces. Import children through those barrels outside their owner; same-owner implementation imports may stay direct to avoid cycles. Keep child feature barrels limited to passive contracts, construction Layers, and intended public accessors. Tests may import original Commands and Bindings from the owning structural modules. A compact child keeps its complete implementation in `block.ts`. When splitting, keep the declaration there and move construction to `layer.ts`, with other responsibilities in their named modules.

Split additional behavior by responsibility; do not add one file per Message or helper. Keep reusable domain Schemas and pure domain operations in `domain/`, independent of Model, update, and view. Feature-specific pure Schemas and helpers can stay with the responsibility that uses them.

For a split root or child:

- `block.ts` declares `FooBlock = Block.make(...)`, its adjacent stable key, Model/Message/InitArgs and optional context/view/input/effect contracts. Export the authoring helpers needed by implementation modules.
- `composition.ts` owns Bindings, child OutMessage policy, child/Mount registration and the Composition's graph-aware builders. It imports no init, update, view or construction Layer.
- `layer.ts` imports those portable builders, completes `FooBlock.makeLayer({ init, update, view, ... })`, and provides child construction Layers. The record acquires init's registered Binding inventory automatically. It exports `layer`.
- `effectsLayer.ts` composes a separate local `EffectsLayer` from attached recipes and explicit host providers. Individual Commands remain in `command.ts` or beside their owning behavior.
- `resource.ts` owns a shared ManagedResource accessor; lifecycle and Command modules import that accessor without creating another Composition.
- `services.ts` composes ordinary providers as `ApplicationLayer`; `entry.ts` selects the root pair, host options and startup inputs, then starts Runtime.

Declare the unique key immediately before its Block and give `Symbol('Feature')` the same description as the Block's readable name. Keep the key private unless verified declaration emission needs its original declaration exported. Split implementation modules commonly need that export because their inferred contracts name the owner key. A public barrel may re-export the original declaration with `export type` when only its identity is needed in types. Verify source and relocated declarations before removing an export.

A split feature's `block.ts` exports the authoring helpers used by its implementation. Named-import those helpers in init, update, command, composition and other implementation modules instead of repeating `FeatureBlock.make*`. A compact feature destructures helpers beside its Block declaration. Retain qualification only when multiple owners would otherwise be unclear. Keep helper aliases out of the feature barrel.

Extract substantial parent policy into `composition/<child>.ts`, with `composition/composition.ts` assembling the graph and `composition/index.ts` as an explicit barrel. Export extracted policies through child-name namespaces, such as `export * as Home from './home'`. Keep flat named exports for the Composition and straightforward local Bindings. Internal sibling imports can avoid barrel cycles; externally import through the public composition entry. Reciprocal policies remain together with deferred sibling calls. Do not move child policy into a generic utility module or duplicate registration lists.

`index.ts` is always a barrel. Export intended names explicitly. Declare each Schema's decoded type on the next line, with the same name and no blank line: `const Foo = Schema.Struct(...)` followed by `type Foo = typeof Foo.Type`. Export both when they belong to the module's public surface. Use `Foo` in decoded-value annotations and `typeof Foo` when an API needs the Schema type. Inside a feature, use its local Model, Message, and OutMessage aliases. Across a child boundary, derive a named alias from the passive contract, such as `type SearchModel = typeof SearchBlock.Model.Type`, without importing the child implementation. Let owned callbacks infer their parameters.

Only entries start execution. Client rendering uses `Runtime.run`; SSR/SSG uses `Runtime.hydrate`. A client app references `entry.ts` from `index.html`. SSR/SSG instead names `ssr.clientEntry` in `vite.config.ts`, imports CSS there, and exports `renderDocument` from `entry.server.ts`; it has no source `index.html`. Keep passive definitions importable by tests and server rendering.

When a server entry creates a long-lived `ManagedRuntime` or another resource, register an `import.meta.hot.dispose` callback in that entry to release it during hot updates. Keep the resource in the entry so its lifetime matches the callback.

With `server.hmr: false`, server modules still reevaluate after edits, but `import.meta.hot` is unavailable and the callback cannot run. Stop and restart the dev-server process after editing server modules that own long-lived resources; an in-process Vite restart does not invoke that missing callback.

Do not use decorative section-header comments such as `// MODEL`, `// OUT MESSAGE`, or `// VIEW`. Use file boundaries, names, and blank lines to show structure. Use `// NOTE:` only for a surprising browser or timing constraint; ordinary behavior should be clear from names and structure.

### Testing

Use Block-aware `Story.story({ block: FeatureBlock, layer }, Story.init(...args), ...steps)` and `Scene.scene({ block: FeatureBlock, layer }, Scene.init(...args), ...steps)`. Each returns an Effect that owns graph construction and cleanup. Inside the test, steps stay synchronous and handlers are not run. `Story.init` and `Scene.init` retain the initializer's Model and Commands; `Story.given(model)` and `Scene.given(model)` deliberately start from a supplied Model. Use `{ block, layer, viewInputs, updateContext, routing }` only for the inputs that test needs; required default-view inputs and URL steps remain checked. Supply the construction `layer` in the pair and provide any remaining construction dependencies through ordinary `Effect.provide`. HTTP/socket Services used only in handler constructors are not needed by pure Stories or Scenes.

Use `it.effect` from the compatible `@effect/vitest` development dependency and return the Story or Scene Effect directly. Keep pure domain and selector tests synchronous. `it.effect` manages execution and scoped cleanup with test services; choose `it.live` for an execution test that deliberately needs the live environment. A plain Vitest test must return or await `Effect.runPromise`; `Effect.runFork` alone does not make Vitest wait for the result.

Pass the Block and its Layer directly in ordinary tests. Reserve `withBlock` for fixture initialization, graph identity, private registrations, or custom multi-view renderers. It is not an alternative application behavior runner. Start startup scenarios with `init` and explicit Command resolution instead of manually calling init/update and dropping Commands. Keep deliberate `given(model)` fixtures. A typed Vitest fixture may need a Promise bridge to keep its acquired Scope alive through the fixture callback.

Use `withBlock` for an advanced fixture that needs acquired initialization or view context. Its callback returns a synchronous value or an Effect; keep the scope alive for the whole test and do not expose a globally acquired root.

For an execution test, use the production handler Layer and provide controlled external services beneath it before construction. The test then executes the real request, response mapping, or lifecycle logic with a deterministic API, storage, RPC, clock, or browser provider. Replacing a complete handler exercises the chosen result path and does not test that handler's implementation. Story and Scene tests resolve Commands without executing their handlers.

Import the Story and Scene namespaces from `foldkit`: `import { Scene, Story } from 'foldkit'`. Qualify every testing step through its namespace, including files that use only one testing style, so `Story.given` and `Scene.given` identify the DSL at every call site.

Name each test file for its test style, beside the code under test: `story.test.ts` for the Story tests (which drive `update`) and `scene.test.ts` for the Scene tests (which drive the rendered view). The name describes how the test works, not a source file, so it stays correct whether `update` and `view` live in `block.ts` or in their own files. A test file lives in the folder that holds the code it drives, so in a multi-page app most of them sit in a page folder rather than at the root. When one folder holds more than one test of a kind (sibling pages, component variants), prefix with the subject: `login.story.test.ts`.

Scene uses a Block and its implementation Layer. Keep `story.test.ts` and `scene.test.ts` with the feature whose behavior they exercise. Root Scenes cover cross-feature flows, including the parent's OutMessage response, lifted Commands, Route changes, and parent-computed view inputs. If the `repos/foldkit` subtree is available, study the tests in `repos/foldkit/examples/`. Auth has a root `src/scene.test.ts` for its cross-page login flow and child `src/blocks/loggedOut/blocks/login/scene.test.ts` and `story.test.ts` for the Login Block.

Story can deliver Messages while Commands are pending. Use `messageWith(model => Message.Variant(...))` when the Message needs the current Model at that step, and `messageIn(ChildBinding, rawMessage)` in a Block-aware Story for a direct child fact. A keyed Binding takes its decoded key before that Message. Never fabricate a generated delivery envelope.

For a nested child, use a nonempty Binding path: `Story.messageIn([AttachmentsBinding, ResumeDropBinding], rawMessage)`. Select a keyed segment with `{ binding: EntriesBinding, key: entryId }`. The runner checks each relationship and builds the nested envelopes. Do not add functions that merely preselect a Binding; a named concrete step is useful when it describes a meaningful interaction.

Use ordinary `it.effect` with explicitly acquired immutable fixture Effects. Keep custom Vitest fixtures when they supply meaningful setup, dependencies or teardown. Ordinary expectations belong in public helpers, not callbacks inspecting simulation internals. `Command.expectExact` is order-independent; use `Command.expectExactInOrder` when Command dispatch order matters. Exact assertions still compare original identity, complete arguments and selected occurrences. Dispatch order does not imply effect or completion order.

Keep Story and Scene specifications declarative. Prefer immutable fixtures and later assertions of Model, OutMessage, pending work, or rendered behavior over carrying a value between steps. Do not use mutable outer captures or `mockImplementation` closures as a test-side data channel. If immutable setup, `messageWith`, and observable behavior cannot express the test, first establish that the Story or Scene DSL has a genuine missing operation.

Compare a sequence with `models(steps(...), (before, after) => ...)`, placing `init` or `given` before the comparison group. `story` returns its final Model after checking every Command was resolved. Bind that result immutably when preparing another Story or Scene; `given(model)` in the new test starts with no pending work and acquires its own graph.

When a Scene emits a Subscription Message, test the selected implementation that owns the registry and call `Subscription.emit(entry, message)` with the exact registered entry. A passive public contract does not expose private lifecycle registries. A lower-level synchronous Scene fixture may supply its concrete registry explicitly. Each entry's `messages` collection declares the raw Messages accepted by that step. Select a bound entry when one source appears at multiple child placements. Silent `messages: []` entries accept no emissions. These steps do not start Streams or simulate Runtime activity and stale-generation admission.

Use `Scene.Command.keepPending(Definition | instance)` when a real interaction must occur before one ordinary Command completes. Its matcher must select one invocation; a bound instance selects its occurrence and args. The Command stays visible to assertions and resolvers, and must be resolved before the Scene ends. This changes only the later-Message boundary check.

Application behavior belongs in Story or Scene. Use their DSL to deliver Messages and InMessages, resolve Commands, and assert Models, OutMessages and views. Do not manually chain acquired `update` calls or invoke application Steps as a substitute for the DSL. Pure fixture construction and intentional `given(model)` remain valid; use scoped acquisition only when a fixture genuinely needs initialized state, graph identity or custom view context. Keep pure domain/selector tests separate from application behavior, and reserve low-level transition tests for framework infrastructure.

## Composing updates

Keep an exhaustive `Composition.makeUpdate({ ... })` record as the default. For additional transitions, use `makeUpdate.cases({ ... })` for selected local handlers, `each(handlerOrStep)` for every dispatch including child delivery, `on(tags)(handlerOrStep)` for selected local tags, and `except(tags)(handlerOrStep)` for every dispatch except those local tags, including child delivery. `cases.withContext` supports contextual records.

Combine focused pieces or reusable bundles with `makeUpdate.compose(...)`. A bundle may have no full update; the final update must contain exactly one exhaustive `makeUpdate(...)` or `.withContext(...)` plan. Pieces run left to right on the latest Model. The full plan handles the local Message or routes the child once at its position. Shared callbacks receive `(model, message, { before }, ...context)`, with the original parent Model in `before` across all grouping and the unchanged Message. They return a result or a Step; compatible Steps can be passed directly. Keep the declared Context tuple.

Shared `each`, `on`, and `except` pieces cannot emit OutMessages. Conflicting record emitters are rejected; Binding OutMessage policies stay unchanged. Commands are collected in order, which does not sequence their effects or completion. Creating pieces stays passive. The same helpers apply to `makeInMessageUpdate`, selecting InMessage tags and using its separate `InMessageContext`. Each entry point preserves its own original `before` Model. InMessage updates do not route child Messages, and their Commands still produce ordinary local Messages. Init remains separate.

## Code Style

- Encode state in discriminated unions, not booleans or nullable fields. `Idle | Loading | Error | Ok`, not `isLoading: boolean`. Make impossible states unrepresentable.
- Use `Option` for absence in the Model and domain values instead of `null` or `undefined`. Foldkit return records are the exception: omit `commands` and `outMessage` when absent. A partial `withOutMessagePolicy({ forward })` mapper returns `undefined` for each child variant that stops at this Block. Prefix Option-typed values with `maybe*`. Match with `Option.match`; don't unwrap with `Option.map(...)` + `Option.getOrElse(...)` when you can just match.
- Use Effect modules over native methods in `pipe` chains (`Array.map`, `String.startsWith`, `Array.findFirst`). Native methods are fine when calling directly on a named variable.
- Never cast Schema values with `as Type`. Use the callable constructor: `Message.SucceededLogin({ sessionId })`, not `{ _tag: 'SucceededLogin', sessionId } as Message`.
- Use `Array.match` for empty/non-empty branches. Use `Array.isReadonlyArrayEmpty` / `Array.isReadonlyArrayNonEmpty` for readonly Model collections, or the mutable predicates for mutable arrays; avoid `.length === 0` / `.length > 0`.
- Prefer `const` and pure collection transformations. Keep unavoidable mutation local to a tight algorithm or resource lifecycle; never hide workflow state in mutable module variables.
- Never use `T[]`. Always `Array<T>` or `ReadonlyArray<T>`.
- Prefer plain array literals wherever contextual typing preserves the required element or tuple types. Use `Tuple.make` only when a value or producer would otherwise widen and lose necessary tuple typing. Do not add it to `children`, `bindings`, or initializer arguments by default.
- Author updates with exhaustive `makeUpdate` records. Branch on already-typed domain and Route variants through their owning union's guards and exhaustive `match`; use Effect `Match` for partial or grouped matches and unions without a matcher. Reserve Schema decoding or `Schema.is` for actual boundary validation. Never use `switch`.
- Use `Calendar` for date-only values and Effect `DateTime` / `Duration` for timestamps and elapsed time. Read the current time in a Command, Subscription, or Flags.
- Always use braces for control flow: `if (foo) { return true }`.
- Use direct `value === undefined` and `value !== undefined` comparisons for undefined checks.
- Use blank lines to show the phases of non-trivial control flow, and prefer a blank line when uncertain. Separate setup, a value read from the guard that consumes it, independent guards or validation cases, writes, and the final return. In a loop, give each skip, failure, or mutation condition its own visual paragraph. Keep statements together only when they form one operation or one explicit `if`/`else` chain. Preserve the required adjacency of a Composition and its ViewBuilder alias. Formatting alone does not choose these logical boundaries; review them while authoring the code.
- Name selectors for derived values (`visibleIssues`), pure transitions for the Model change they describe (`mergeWorkspaceSnapshot`), and dedicated handlers `handle<MessageTag>`. Use `init` for initialization functions, helpers, Steps and filenames, such as `initRoom` and `init.ts`. Use `init...IfMissing` for conditional creation. Reserve `sync` and `observe` for actual synchronization or observation. Commands describe effects for Runtime; a Step only computes state and Commands.
- Name a transition for the operation it performs at its own boundary. Use `request` when it asks another owner to act, rather than when it already computes that operation's Model changes and Commands. OutMessages distinguish a submitted request from a completed fact; do not report `Closed` or `Saved` before the owner performs that action. Name response records for the data they contain, distinguishing a revision from a complete entity.
- Don't add inline comments to explain code. Use better names instead. Reserve `// NOTE:` for behavior that would mislead a careful reader.

## Message Layout

Declare the whole Message union with `defineMessageUnion()`:

```ts
const Message = defineMessageUnion({
  ClickedSubmit: {},
  UpdatedEmail: { value: Schema.String },
})
type Message = typeof Message.Type
```

Keep the `Message` type alias immediately below its Schema, with no blank line, and use it in explicit annotations. Block-owned and Composition-owned helpers infer owned callback parameters. Construct values through the namespace (`Message.ClickedSubmit()`) and handle local facts in the Composition's exhaustive `makeUpdate` record. Never destructure constructors from `Message` or `OutMessage`; the owning namespace stays visible at every call site.

Keep each case's payload object on one line when it fits. Let Oxfmt wrap payloads that need more space, so the declaration remains easy to scan as one variant per line.

Declare an ordinary Block `InMessage` union with `defineInMessageUnion()` using the same layout. Local Messages and OutMessages continue to use `defineMessageUnion()`.

Messages are verb-first past-tense. Common prefixes: `Clicked*`, `Updated*` (input changes and external state updates), `Submitted*`, `Pressed*`, `Selected*`, `Succeeded*` / `Failed*` (paired async results), and `Completed*` (every other Command result). Keep the authored Message local; child delivery variants are generated by the Composition.

## Debugging

This project ships with `@foldkit/devtools-mcp` pre-wired. When the dev server is running and the app is open in a browser, `foldkit_*` MCP tools let you inspect Model, Message history, and time-travel. The generated entry opts into external Message Schema discovery and dispatch with `devTools: { dispatch: true }`; after graph acquisition, Program uses the executable's complete Message Codec, including generated child envelopes. The passive contract carries local Message constructors. Reach for those tools before adding `console.log` whenever the question is about state or Message flow.

Treat those tools as privileged access to the application. They can return Models, Message payloads, and Command and Mount arguments to the agent. Keep credentials and private data out of browser state. Use Effect `Redacted` for sensitive values the browser must temporarily hold, and set `devToolsMcpPort: false` in the Foldkit Vite plugin options when an agent should not inspect the running application.

## Going Deeper

For Blocks and OutMessage, Subscriptions, Mount / ManagedResource / CustomElement, field validation, routing, accessibility, and the full convention set, read the live Foldkit code in `repos/foldkit/`. The `examples/` directory and the production apps (`packages/typing-game/`, `packages/website/`) are the highest-fidelity references for any specific pattern. The `foldkit-skills` plugin's `generate-program` and `audit-program` skills carry written snapshot guides if you want a structured walkthrough.

## Extracted Message-dependent Steps

Inline handlers receive their exact Model and Message from the Composition. When extracting a Message-dependent callback without that context, annotate its precise Message variant, as in `makeStep((model, { url }: ChangedUrl) => ...)` or `makeStep.fromMessage(({ url }: ChangedUrl) => ...)`. The helper still infers result channels. The proposed single-Message type-argument forms are not supported; defaulting the remaining type parameters loses output inference. Do not replace the useful parameter annotation with broad return types, casts or repeated generic arguments.

## Public runtime requirement bounds

The public `effects` contract bounds runtime capabilities: `services` lists ordinary handler Services, `managedResources` lists resource accessors, and `Error` bounds handler-constructor failures. Explicit operation declarations and `inMessageOutputs` use the same `managedResources` spelling for their extra resource requirements. These contracts describe capabilities; local `EffectsLayer` selects their handlers. Construction dependencies still flow through ordinary Layer provision, and ordinary request Services stay inside handler constructors.

Do not declare `codec` on a Block. Foldkit requires the Model, local Message, and complete generated Message Codecs to encode and decode synchronously without Effect Services. Generated child envelopes propagate their requirements through the registered graph, so a Service-dependent child Message also rejects its parents. Synchronous transformations backed by `Effect.succeed` and standard `Option` and `Date` JSON Codecs remain valid. An Effect requirement of `never` proves only that no Service is needed; a Promise-backed transformation is rejected when Foldkit actually serializes or deserializes a value. Block declaration, Composition, Layer construction, and Program construction remain passive. This restriction does not narrow private Codecs used inside Commands or other effectful APIs; supply those requirements in the Effect that runs them.
