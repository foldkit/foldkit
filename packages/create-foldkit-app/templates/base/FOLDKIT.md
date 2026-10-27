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

- Name a concrete typed Block authoring value `<BlockId>Definition`, such as `SearchDefinition = Block.makeDefinition('Search', ...)` and `ApplicationDefinition = Block.makeDefinition('Application', ...)`. Keep the runtime ID unchanged. Name the corresponding Composition `<BlockId>Composition` or `ApplicationComposition`. Export ordinary completed values as `SearchBlock` and `ApplicationBlock`; a generic factory returns an exact completed Block that its caller names locally.
- Foldkit is tightly coupled to the Effect ecosystem. Do not suggest solutions outside of Effect-TS.
- Model fields must be Schema types (the model is a schema). Plain TypeScript types are fine elsewhere (function return types, local variables, etc.).
- Use full names like `Message` (not `Msg`), and `withReturnType` (not `as const` or type casting).
- Suffix Model fields containing an `AsyncData` value with `AsyncData`, such as `workspaceAsyncData` or `weatherAsyncData`. A field storing a Query Model is a child Block Model and does not take this suffix.
- Declare every variant together: `defineMessageUnion()` for Messages, `defineTaggedUnion()` for other domain unions, and `defineRouteUnion()` for Routes.
- Keep constructors on their union: `Message.ClickedSubmit()`, `FetchState.Ok({ data })`, and `ApplicationRoute.Home()`.
- Use `taggedStruct()` only when the variants cannot be declared together, such as a recursive union.
- Push back on any direction that violates Elm Architecture principles: unidirectional data flow, messages as facts (not commands), model as single source of truth, side effects confined to commands. If a prompt suggests mutating state, imperative event handlers, or two-way bindings, flag the issue and propose the idiomatic Foldkit approach.
- Never use `NoOp`. Every message must describe what happened. A command's result message is named from the command, not from the fact it reports, whether or not it carries a payload: `LockScroll` → `CompletedLockScroll`, `DetermineStartTime` → `CompletedDetermineStartTime` (never `DeterminedStartTime`).

## Foldkit Patterns

### Asynchronous data

Use `AsyncData` directly when the owning Block's Messages and Commands participate in application-specific transitions, such as reconciling mutation results or optimistic rollback. Consider experimental `Query.define` when Query should own fetching, retained data, refresh, and stale-response protection. Keep one authoritative collection rather than copying Query data into a second Model field. Parent coordination uses the child's public operations and OutMessages; do not modify a Query Model's internal data to bypass a missing operation.

Experimental Query and KeyedQuery values are completed viewless Blocks. Bind them with the same parent `makeBinding` method and include the Binding under `bindings`; use the Binding's `requestReset`, `requestRevalidation`, `requestRevalidationOrLoad`, and `requestLoadIfMissing` operations. The Query value itself retains direct `read` and `run` conveniences. Query preserves Fetch identity, handler completeness, host delegation, constructor errors and Service requirements, request generations, stale-response protection, and cache-key typing through standard Block composition. KeyedQuery entries are cache data inside one child Model, not keyed Block instances. A canonical Query supplies `query.EffectsLayer`; a host-owned Query omits `handler` and is completed with `query.provideHandlers(query.toLayer(...))` before binding.

### State ownership

Keep the canonical domain data with its owner. Give each editor its own baseline, draft, and submission state. A baseline is an intentional historical value; current display data such as comments belongs in view inputs. Use update context (`delivery.toUpdateContext`) for current parent data needed while handling a Message. Use an `inform*` operation when an external event requires the child to transition, return a Command, or emit an OutMessage. Changing inputs or context does not dispatch a Message. Avoid acknowledgement informs that repeat a transition the child already performed.

Build around the application's requirements and normal user workflows, including reasonable failure and retry behavior. Introduce abstractions for concrete repeated responsibilities; unusual event combinations do not by themselves justify additional framework APIs or application orchestration.

Independent interactions need independent pending and failure state. A project save should not block an unrelated issue move or share feedback that a background response can clear. Keep exclusivity explicit when operations really must serialize.

Decide what navigation does to unfinished work. Repeated URL delivery or a refresh should not silently replace a dirty draft. Retaining a keyed editor lets its draft and pending save survive navigation. Removing its occurrence ends its lifecycle and invalidates later delivery; keep the owner present when its result must still update the application. Apply mutation results to the data that operation owns, so a delayed response cannot replace unrelated newer state.

### Update

Author init, update, and the canonical view through the same named Composition. Updates accept one exhaustive handler record. Each case receives the contextual Model and its exact Message; registered child envelopes route before local handlers:

```ts
const update = ApplicationComposition.makeUpdate({
  ClickedIncrement: model => ({
    model: modifyFields(model, { count: count => count + 1 }),
  }),
})
```

Use `makeUpdate({})` when there are no local Messages. Use `makeUpdate.withContext(context => cases)` for extra dispatch arguments. The factory runs for local dispatch, not routed child-only delivery. Keep purposeful parameter types for operation inputs and context; let owned callbacks infer Model, Message, returns, and Command requirements. Do not hide inference failures with casts or broad return annotations.

Return ordinary handler results directly. Use Step helpers for reusable transitions, sequencing, OutMessage policies, or useful specialized shorthand; do not wrap every handler in `makeStep`. Steps can live in `update.ts` or an owning helper module as well as composition files. Colocate parent coordination with its Bindings and policies. Name an extracted single-Message handler `handle<MessageTag>` and pass it directly when its signature fits. Give every named Model-first Step value a descriptive name ending in `Step`, such as `refreshStep`. Give a purposeful transition factory that returns a Step an operation name ending in `Step` too. Factory methods, imported authoring helpers, named OutMessage folds and matchers, direct inline handlers, public operation keys, Message tags, and applied update-like results keep their established names. An existing compatible Model-first Step can be the record value, such as `ClickedOpenSearch: SearchBinding.requestOpen()` or `CompletedSave: makeNoopStep()`. Keep a callback when it adapts payloads, reads Model-dependent arguments, defers argument construction, supplies context, or is needed for contextual inference.

In a split feature, `definition.ts` exports the Step helpers used by its implementation, such as `export const { makeStep, makeFieldsStep, makeNoopStep } = FeatureDefinition`. Import those helpers by name in `update.ts`, policy modules, and other implementation files. A compact feature destructures them beside its Definition in the scope that uses them. Keep Definition-qualified calls when a module works with several Definitions and the qualifier identifies the owner. Keep authoring helpers out of the feature barrel; export the completed Block there.

If one handler mixes connected Binding recipes with local results, author its local branches through Definition-owned Steps. A raw `{ model }` beside a connected recipe is rejected because it can erase channels. Generic Steps in a context factory may likewise need `model => step(model)` for inference. Ordinary raw-only handlers need no Step wrapper.

The update is dual: `update(model, message, ...context)` and `update(message)(model, ...context)`. The curried form is an internal Step. Record-authored updates retain each selected Message's Command and OutMessage contract; utilities inspecting the whole update retain their union. Extracted helpers must preserve those channels too. Avoid a fixed `Update.Return<Model, Message>` annotation on a Command-producing handler: its default requirement is `never`.

Use `modifyFields` from `foldkit/struct` for immutable Model updates, including nested updates. Never spread or `Object.assign` an existing Model. Keep an update-like result together under an operation name such as `homeInit` or `dialogClose`, then access its fields. Do not destructure or rename `model`, `commands`, or `outMessage`. Pass optional Commands directly to APIs that accept them, such as `Command.mapMessages`; use `commands ?? []` only when a concrete array is required.

Omit `commands` when a producer statically creates none. Return a computed collection directly, even when empty. Never write a literal `commands: []`. A Boolean-conditioned Command group uses `Array.filter(commands, () => condition)`. Actual optional absence still uses `Option`.

### Steps

Choose the helper for the result the Step produces:

| Result                                                                                      | Helper                                            |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Own Model field changes                                                                     | `Definition.makeFieldsStep(model => transforms)`  |
| Unchanged Model                                                                             | `Definition.makeNoopStep()`                       |
| Commands with unchanged Model                                                               | `Definition.makeCommandsStep(model => commands)`  |
| One declared OutMessage with unchanged Model                                                | `Definition.makeOutMessageStep(() => outMessage)` |
| Conditional or composed results, initialization, connected operations, or combined channels | `Definition.makeStep(model => result)`            |

All three focused helpers take producer callbacks. An ordinary producer receives the current Model and, in a Message-dependent handler, its exact Message. Use `.fromMessage(message => value)` for payload-only producers and `() => value` for fixed producers. Pass the returned compatible Step or handler directly to `makeUpdate`; keep cohesive mixed transitions as direct results.

Use `makeStep.fromMessage(message => stepOrResult)` when the Message selects or constructs a composed Step or initialization recipe without reading the Model. Inline handler records infer the exact Message variant; extracted producers need a precise variant parameter annotation. The returned handler receives `(model, message)`, evaluates the producer on application, and passes the incoming Model to a returned Step. Keep ordinary `makeStep` for Model-aware producers and additional operation arguments. Close over dispatch context through `makeUpdate.withContext`.

Step construction is passive. Producers run when applied. Commands-only and OutMessage-only helpers preserve the same Model object. Runtime executes effects later. An extracted Message-dependent producer needs a precise Message variant parameter when no surrounding handler record supplies it. Map payloads explicitly when constructing a different Message or OutMessage; do not forward its incoming `_tag` through a constructor reference.

Inside a local `makeStep` callback, return results directly, including `{ model }` for an unchanged Model. Do not construct and immediately apply another local Step merely to express a branch. Keep reusable operations, sequential composition, and canonical local Steps required by mixed connected recipes. An empty `makeFieldsStep` record preserves Model identity. For a helper that gates editing, a Model-to-Model callback keeps `modifyFields` validation at the call site without duplicating generic machinery. `FieldTransforms<Model>` is a structural convenience type, not an exact-key or union-variant validator.

Use `Update.combineSteps` to apply Steps sequentially to the preceding Step's Model. Call a single Step directly. Name an inline parameter `stepModel`. Commands join one batch; their collection order does not sequence completion. The combinator rejects OutMessage-producing Steps. Include an already-known OutMessage directly in a new result, or attach one to an existing plain result with `Update.withOutMessage`. The latter cannot recover an OutMessage discarded upstream.

### Blocks and Bindings

Define `ChildDefinition = Block.makeDefinition('Child', { Model, Message, OutMessage? })`, establish `ChildComposition`, and author its init, update, and view. Return `ChildComposition.prepareBlock(...)` from one private zero-argument producer named `prepare`. Immediately follow it, without a blank line, with the checked export initialized by `Block.assemble(prepare)`. Choose the actual `Block.FromAssemblyWithView`, `FromAssemblyWithViewAndOutMessage`, `FromAssemblyWithOutMessage`, or `FromAssemblyWithoutViewOrOutMessage` header using `typeof Model` and `typeof prepare`. Descriptive producer names are for files containing several producers.

Preparation checks the implementation and returns an opaque unfinished value. Assembly returns the branded Block accepted by Bindings, Programs, and Server rendering. Both are passive. The explicit canonical Model header prevents parent Schema construction through `ChildBlock.Model` from inferring the whole implementation again. Keep this boundary; casts, broad annotations, `satisfies`, or calling the raw producer do not replace it. Feature barrels export only the completed Block. Shared Schemas and pure domain utilities belong in an explicit domain barrel.

Use a Block when a feature owns interaction state, effects, or lifecycle. Pure domain functions and render-only helpers remain ordinary functions. A generic factory that needs shared early identity creates `FeatureNamespace = Block.makeNamespace('Feature')`, then its typed Definitions through that Namespace. Create the shared Namespace once at module scope. An ordinary feature likewise creates its Definition once at module scope.

The root follows the same pattern and exports `ApplicationBlock`. `Program.make` or `Program.makeElement` adds the container, routing, Flags, and host configuration. Provide ordinary Services through `program.provide(ApplicationLayer)`; only the Runtime starts execution.

Published packages also need a named declaration boundary: an interface extending the matching checked `FromAssembly*` header, followed by the same-name annotated value. Generic factories can use a named generic completed interface. Verify emitted declarations and external consumption, not only `noEmit`. This prevents repeated declaration expansion; it does not remove every source of TypeScript latency.

If a large Composition needs an exact named Binding tuple for declaration emission, export that type from `composition.ts` so other modules can name it. Keep the feature barrel limited to the completed Block. Check type visibility before adding another implementation inventory to `block.ts`; Workspace retains ordinary assembly through this existing TypeScript boundary. Do not add tuple inventories to ordinary applications without a measured serialization failure.

The parent declares `ParentDefinition.makeBinding(ChildBlock, config)` and registers that Binding in its Composition's `bindings`. Registered Bindings contribute child handlers and lifecycle entries automatically. The parent's authored Message contains local facts only; `Composition.Message` and `ChildBlock.Message` add generated child envelopes. Use those complete contracts for cross-module dispatch types. Do not author `Got*` wrappers or Message mappers, inspect internal child Message tags in parent update, or update child fields directly.

Choose storage from the parent Schema:

- An exact child or `Option<Child>` field uses `field`. `None` means absent; ordinary operations never create it. `presentWhen` gates the whole direct child; `subscriptions.when` gates only Streams.
- A keyed array uses `field` and `key`, the name of a stable string or finite-number identity field. Wrapped arrays and an Option-wrapped instance also specify `childField`. Keyed identity does not imply multiple stored children.
- Exact Record/HashMap storage uses `ParentDefinition.makeMapBinding(ChildBlock, { field })`. Add `childField` for a closed wrapper around the child Model. A split feature can export the destructured `makeMapBinding` from its `definition.ts`; import the factory from that owning module. Use its field-derived key contract and preserve a separate ordered ID list when order matters.
- Custom unkeyed storage uses `read` and `write`. General keyed storage uses `readAll`, function `key`, exact `keySchema`, `read`, and `writeAt`.

Placement identifies a relationship in the graph. Direct and map fields default it to their field; keyed arrays, keyed Options, and static accessors default to the child Block ID. The occurrence key identifies one child within a keyed relationship. Override placement only for a sibling collision or deliberate stable identity.

A writer places the next child Model into its storage, preserving wrapper metadata and respecting absence and key identity. Parent reactions belong in OutMessage policy. If a required fact is missing, add a truthful child OutMessage instead of using the writer as an event hook. Use `delivery.when` for admission and `delivery.toUpdateContext` for exact update context; keyed policies receive the occurrence key. Message-free children (`Schema.Never`) need no delivery policy.

Parent-driven transitions invoke Binding operations. Under the child's `operations`, put a Message constructor directly when its payload is the public input; use a tuple producer for mapping, refinements, defaults, or exact context arguments. Assembly associates the operation with update without eagerly constructing Messages. Bound calls process the Message synchronously through child update. Name actions `requestCloseMenu` → `Message.RequestedCloseMenu`, and notifications `informJoined` → `Message.InformedOfJoin`. Avoid silent `reflect*` changes.

Connected Binding operations require the registered graph. Apply them in Composition-authored init/update or return them through the parent's `makeStep`; preserve opaque results intact. They expose no useful `.model` or `.commands` before checked execution. The Composition resolves their final channels. Completed `ChildBlock.operations.name(model, ...args)` accepts the child's raw Model and returns an executed result; ordinary pure Steps also remain callable. TypeScript can erase a connected function's result through `void`, but outside the graph that call only constructs and discards passive configuration.

### OutMessage policies

Select every child OutMessage policy with `withOutMessagePolicy`. Keep folds callable and author both inline and extracted folds through `ParentDefinition.makeOutMessageFold(ChildBlock, cases)`, always passing the completed child explicitly. Name every variant, including singleton unions. The helper contextually types payloads and preserves inferred requirements and registration evidence. Do not substitute a raw child matcher or repetitive generic annotations. Take the inferred `FoldContext` argument only when using its lifters or previous Model.

Keep ordinary policies fluent. For self-referential or reciprocal coordination, declare the operation-bearing Bindings first, then their folds and selected `FooBindingWithOutMessagePolicy` values. Register the selected values. Keep mutually coordinating policies together and defer sibling calls through callbacks to avoid initialization and import cycles.

Include `forward` only when at least one child variant continues to this Block's parent. Author it with `makeOutMessageForward`, passing the child explicitly when extracted or adapted for keyed policy. Name every variant and return `undefined` for those that stop. Local `fold` policy still runs for forwarded variants; a derived parent OutMessage takes precedence over one-to-one forwarding. A no-op fold branch is point-free `Closed: makeNoopStep`; an update-record no-op calls the factory: `CompletedFocus: makeNoopStep()`.

### Child initialization

Keep child state retention, rendering, and activity as separate decisions. A Route change can select another view while retaining child Models in the parent. Store multiple retained editors by entity identity when navigating A to B to A should preserve both. A retained occurrence can still receive pending results; gate its Subscriptions or other activity explicitly when necessary. Remove child state for an application reason such as deletion or eviction. Use `init...IfMissingStep` for application Steps that preserve an existing occurrence and initialize only an absent identity.

Author one `Composition.makeInit` with a concrete signature; optional, default, and rest arguments remain exact. Return parent-owned fields under `model`, optional root `commands`, and `steps` for transitions after child fields exist. An optional Definition `ChildInitContext` Schema describes shared data produced by parent init; each child's `init.contextToArgs` selects initializer arguments from that context. Return the value as `childInitContext`. It does not describe the parent's own init arguments.

For a required direct child whose initializer accepts no arguments, omit `init` for automatic initialization. Required inputs use `init.contextToArgs`; `init: false` makes the parent supply the field. Optional, keyed, and accessor storage remains parent-owned when `init` is omitted. An optional direct field's selector returns `Option<tuple>`. Keyed arrays use `init.instances` returning ordered `{ key, args }` records and `init.toItem`; custom accessors can use `init.toParentFields`. Preserve the planned key and exact initialized child Model inside plain wrapper records.

Composition initializes selected children once in Binding order, then applies startup Steps. Parent Commands precede retained child init Commands; startup Step Commands follow. Commands are a batch, with no asynchronous completion-order guarantee. Init Commands for absent children are filtered out. Use existing meaningful operations in startup Steps; do not invent a separate boot phase or a Message solely for startup when init can accept the inputs.

Dynamic creation or deliberate replacement returns `Binding.init({ key?, args, toParentModel })` intact from Composition-owned authoring. It is a passive, noncallable recipe with no `.model` or `.commands`. Reinitializing an existing occurrence does not create a fresh generation or cancel pending work; lifecycle-sensitive resets belong in a child operation.

Use the optional `foldkit/bindingInit` helpers when initialization only places the child in declared storage. Pass the Binding, current parent Model, and `{ args }`, adding `key` for keyed storage:

- `initAndSet` replaces a required or optional direct field, or a keyed Option wrapper containing only its key and child fields. Direct storage needs no startup policy. A custom unkeyed accessor can reuse its existing `init.toParentFields` projection.
- `initAndAppend` appends an absent keyed array occurrence using an existing startup `init.instances` and `init.toItem` policy.
- `initAndInsert` inserts an absent Record/HashMap key when `ParentDefinition.makeMapBinding` stores child Models directly.

All return passive recipes retaining child init Commands and registration requirements. Append and insert reject existing keys. Keep explicit `Binding.init` for additional wrapper metadata, sibling changes, parent Commands, custom storage without a projection, array/map replacement, or a whole tagged variant. Do not add an unnecessary startup policy for a helper. Same-key reinitialization does not establish a fresh generation or cancel pending work.

For Record/HashMap fields storing child Models directly, use `makeInitIfMissingStep(Binding, { key, args })` from the same module when existing children should be retained. It derives storage from the Binding and returns a connected Step. Applying it preserves the exact parent Model and emits no Commands for an existing key; an absent key initializes and inserts the child with its Commands. Both paths require the registered Binding. Pass the Step directly to `Update.combineSteps` or a compatible handler; use the owning `makeStep` when selecting or composing Steps. Keep entity lookup and handling of unknown URL IDs in the application.

### Routing

Parse the initial URL in init and later URLs in the `ChangedUrl` handler, then store a typed `ApplicationRoute` in the Model. Use `Route.parseUrlWithFallback` for a full `Url` and `Route.parsePathWithFallback` for an origin-relative path, including query parameters.

When a query value represents a Route or another domain value, decode it through a Schema transformation passed to `Route.query`. Keep the application Route Schema plain so Model serialization carries the decoded value. Encode the value back to a string when building the URL. Rendering and selectors use the typed value directly.

### View

Every view receives `h`, the typed Html builder, as its last parameter. Define the canonical completed view through its owning Composition's `makeView` or `makeView.withInputs`. A completed Block's `makeView` method authors only an alternate embed view against its already fixed graph. Ordinary extracted helpers are plain functions. After establishing `FeatureComposition`, declare `type FeatureViewBuilder = Block.ViewBuilderFor<typeof FeatureComposition>` on the next line with no blank line and use that alias for feature-local helpers. Export it only when another file uses it. It retains the feature Message type and registered child and Mount capabilities without constructing a runtime builder. The owner prefix is deliberate even though internal structural contracts remain `Model`, `Message`, and `OutMessage`: the completed `FeatureBlock` owns those public contracts, while the builder alias identifies one Composition's capabilities at a plain type import site. Give each helper only the Model, domain value, or context parameters it actually reads, followed by `h`; let TypeScript infer whether it returns one `Html` value or an array. Rendering genuinely shared across owners takes the framework's general `HtmlBuilder<Message>` form, with capability requirements when needed. Never annotate the primary view's inferred `h` parameter. Never construct a builder; reach for `h.div`, `h.OnClick`, and other helpers from the parameter. Only where no builder is in scope, typically module scope, use `inertHtml` from `foldkit/html`, aliased `ih`. Use `h.empty` (not `null`) for conditional rendering, the union's own exhaustive `match` for discriminated unions, and `Array.match` for lists that may be empty.

Key mapped list items and entity slots by stable identity: key each row by a stable Model identifier (`h.keyed('li')(item.id, [], [...])`), never by array position, and never derive a key from displayed data. Key an entity slot by entity ID when its identity changes at the same position. Never key branches; the build gives each view function's output its own identity, so branch switches replace DOM automatically. When switching an inline same-tag ternary must reset DOM state, extract each arm into its own named view function.

Omit the children argument when an element has none: `h.div([h.Class('divider')])`, never `h.div([h.Class('divider')], [])`. The same holds for `keyed`: `h.keyed('li')(key, [attrs])`, never `h.keyed('li')(key, [attrs], [])`. Attributes stay required on element builders, so `h.div([])` is an element with neither. Sibling elements that end up at different arities are expected and fine; void elements like `h.img` have always read that way.

### Commands

Define a Command with `FeatureDefinition.makeCommand(name, { args, messages, handler })`; omit `args` when it takes none. Assign definitions to PascalCase constants. Keep the handler Layer beside its definition. Name the work the handler performs, not the later Model transition caused by its result: a timer that waits before update begins dismissal is `WaitBeforeDismissal`. Convert expected failures to result Messages with `Effect.catch(() => Effect.succeed(Message.FailedX(...)))`. Defects follow the application's crash handling. Commands belong beside the update that returns them.

`handler` is a generator constructor. Foldkit applies `Effect.gen` once per Runtime start; capture stable Services there and return the invocation function. Requests, delays, time reads, and DOM operations happen inside that returned function with current args. A constructor needing no setup still returns the function directly. Omit `handler` only for an external host contract; provide its implementation Effect constructor through the original definition's `toLayer`.

Compose attached `.layer` recipes in the feature's local `EffectsLayer`, including its Command, Subscription, Mount, and ManagedResource handlers. Registered child Bindings contribute their own recipes. `ApplicationLayer` supplies the remaining ordinary Services. Reserve `Layer` for Effect's module; create a standalone `<DefinitionName>Layer` only when that individual provider is independently public or reused, and name alternatives `<DefinitionName>TestLayer`. Ordinary execution tests retain the production handler Layer and replace the Services beneath it.

Command args contain values already in the Model or Message. Read time, randomness, and UUIDs inside the invocation Effect and return them in result Messages. Use `Dom` for browser operations and Effect's `Clock`, `Random`, `Crypto.Crypto`, and `Effect.sleep`; provide the platform Crypto Layer when needed. Avoid raw `document.querySelector`, `setTimeout`, `Date.now()`, or `Math.random()` in app transitions.

For with-args handlers, see `repos/foldkit/examples/weather/src/command.ts` or `repos/foldkit/examples/kanban/src/command.ts`; `FocusAddCardInput` in Kanban demonstrates an argless DOM Command.

### Lifecycle effects

Create one `Definition.makeSubscriptions(...)` registry for all Subscriptions owned by a Block. Add entries to that record and extract substantial Stream implementations into helpers instead of creating another registry for the same owner. Distinct child Blocks retain their own registries. Subscriptions declare `messages`, their Model projection, and `handler` in the entry config. The handler generator returns a function from dependencies to a Stream. When every owned entry has an attached handler, include `subscriptions.layer` in the feature's `EffectsLayer`. When Subscription declarations are split from Block assembly, that module exports the Block's one registry; compose `Feature.subscriptions.layer` directly in `layer.ts`. When the registry supplies the complete local handler bundle, pass `EffectsLayer: subscriptions.layer` directly to `prepareBlock`. The registry Layer is a passive recipe, is `Layer.empty` for an empty record, and is unavailable for mixed host ownership. The entry key `layer` is reserved. Individual entry recipes remain available for intentionally selective assembly. Use `Subscription.aggregate` only at graph, adapter, or test boundaries that join independent records. The Message declaration limits what that Stream can emit; use `messages: []` for silent scoped work. The generator runs once for a runtime start. Restarting the Subscription reuses that factory and its application-lifetime providers. A host-owned entry may omit `handler` and receive its implementation through `toLayer`, which accepts the implementation Effect constructor.

Before choosing a ManagedResource, identify the Command or other consumer that needs its handle. Model-gated listeners or scoped work with no handle consumer belong in a Subscription, including `messages: []` when they emit nothing. Installing a listener and removing it on cleanup is not enough reason to create a ManagedResource. Use a Mount when one rendered element owns the work. See [lifecycle ownership](https://foldkit.dev/core/subscriptions#lifecycle-ownership) for the decision rules.

Mounts use the same `config.handler` generator and `.layer` convention. The returned operation receives the live element; perform DOM work there. Include the definition in its owning Composition's `mounts`. A ManagedResource entry likewise stores a handler generator in its config. The generator returns an object with required `acquire` and `release` functions. Supply cleanup explicitly. A no-op release is appropriate when scoped acquisition already registered the real finalizers, as with `Layer.build`. Foldkit finishes explicit release and scoped cleanup before clearing the handle and emitting `onReleased`.

An owned `Definition.makeManagedResources(...)` registry exposes `managedResources.layer` only when every entry has an attached handler. Empty registries provide `Layer.empty`; mixed or host-owned registries require explicit entry providers. The registry key `layer` is reserved, matching Subscriptions. Merge the aggregate into local `EffectsLayer`; construction remains passive.

Keep the four lifetimes distinct. Application services such as RPC clients last for one Runtime start. A Command Effect lasts for one dispatch. Subscription Streams and ManagedResource handles follow Model conditions. Mount acquisition follows one DOM element. A handler generator may capture a stable service or accessor. It must not capture current time, Command args, Subscription dependencies, a DOM element, or an active ManagedResource handle. Captured services remain fixed for the Runtime start. Contextual lookups use the merged invocation context, where invocation services win. Looking up a service retrieves a provided instance; it does not construct the provider.

Handlers and services may own mutable execution bookkeeping, such as worker availability or protocol request IDs. The Model and update own pending work shown to the user, selections, and submission rules. A `Ref` created in the constructor must not become the source of truth for workflow decisions or state read by view.

### File organization

When using Tailwind, keep reusable static control recipes in the stylesheet's `@layer components`, where ordinary utilities can override them. Use `@utility` when adding an actual utility that needs variants. Keep `clsx` for conditional classes. Avoid a TypeScript module whose only job is assembling and exporting static class strings.

Name each child feature folder after its completed Block in camelCase: `IssueBoardBlock` lives in `issueBoard/`. A compact child keeps its entire implementation in the matching `issueBoard.ts`. Once any structural responsibility is extracted, use the complete split layout and remove `issueBoard.ts`; do not leave it combining init, assembly, or other pieces.

Split additional behavior by responsibility; do not add one file per Message or helper. Keep reusable domain Schemas and pure domain operations in `domain/`, independent of Model, update, and view. Feature-specific pure Schemas and helpers can stay with the responsibility that uses them.

A genuinely compact root lives in `application.ts`. Once the root is split, use the complete split layout:

- `model.ts`, `message.ts`, optional `outMessage.ts`, `init.ts`, `update.ts`, and `view.ts` own their named responsibilities; use `view/` or `update/` when substantial behavior warrants it.
- `definition.ts` imports the Model, Message, optional OutMessage, and optional ChildInitContext Schemas from their own files, creates `ApplicationDefinition`, and exports the authoring helpers used by its implementation. Otherwise chain the Definition factory into the Composition declaration and remove the empty file.
- `composition.ts` owns Bindings, parent OutMessage policy, child/Mount registration, `ApplicationComposition`, and its optional builder alias. It does not import root init, update, view, or the completed Block.
- `block.ts` imports those implementations and assembles `ApplicationBlock`. Remove an emptied `application.ts`; do not retain it as an aggregation wrapper.
- Commands belong to the feature whose update returns them. Keep small definitions alongside update or use feature-local `command.ts`. Compose local recipes there; extract `layer.ts` when the bundle is substantial or reused.
- `services.ts` supplies the root `ApplicationLayer` of ordinary Services. `entry.ts` chooses the Program host options, provides that Layer, and starts the Runtime. A test provider is `ApplicationTestLayer`.

A split child uses the same named files and dependency direction. Keep `FooDefinition` only when its authoring members are used. The final `block.ts` may compose a small local EffectsLayer. Shared Mount definitions live in `mount.ts`. Each feature’s `index.ts` exports its completed Block; internal exports needed by siblings and tests do not widen that barrel.

Extract substantial parent policy into `composition/<child>.ts`, with `composition/composition.ts` assembling the graph and `composition/index.ts` as an explicit barrel. Export extracted policies through child-name namespaces, such as `export * as Home from './home'`. Keep flat named exports for the Composition and straightforward local Bindings. Internal sibling imports can avoid barrel cycles; externally import through the public composition entry. Reciprocal policies remain together with deferred sibling calls. Do not move child policy into a generic utility module or duplicate registration lists.

`index.ts` is always a barrel. Export intended names explicitly. Routine app annotations query `typeof Model.Type` inside the owner and `typeof ChildBlock.Model.Type` across a child boundary, with analogous Message and OutMessage queries. Keep aliases only for deliberate library contracts or useful generic, mapped, and conditional types, including the owner-specific ViewBuilder.

Only entries start execution. Client rendering uses `Runtime.run`; SSR/SSG uses `Runtime.hydrate`. A client app references `entry.ts` from `index.html`. SSR/SSG instead names `ssr.clientEntry` in `vite.config.ts`, imports CSS there, and exports `renderDocument` from `entry.server.ts`; it has no source `index.html`. Keep passive definitions importable by tests and server rendering.

Use section headers only when a long file needs wayfinding. Use `// NOTE:` for a surprising browser or timing constraint; ordinary behavior should be clear from names and structure.

### Testing

Test update functions with `foldkit/test`. Since update is pure, tests run without a runtime, DOM, or side effects. Use `story` for update-level tests (send Messages, assert on Model and Commands) and `scene` for feature-level testing through the view with accessible locators.

For an execution test, use the production handler Layer and provide controlled external services beneath it before construction. The test then executes the real request, response mapping, or lifecycle logic with a deterministic API, storage, RPC, clock, or browser provider. Replacing a complete handler exercises the chosen result path and does not test that handler's implementation. Story and Scene tests resolve Commands without executing their handlers.

Import the steps as named imports from `foldkit/story` or `foldkit/scene`: `import { Command, given, message, model, story } from 'foldkit/story'`. A test file needs only one of the two modules. If a single file ever tests both, import the namespaces instead (`import { Scene, Story } from 'foldkit'`) so `Story.given` and `Scene.given` stay distinguishable.

Name each test file for its test style, beside the code under test: `story.test.ts` for the Story tests (which drive `update`) and `scene.test.ts` for the Scene tests (which drive the rendered view). The name describes how the test works, not a source file, so it stays correct whether `update` and `view` live in `application.ts` or in their own files. A test file lives in the folder that holds the code it drives, so in a multi-page app most of them sit in a page folder rather than at the root. When one folder holds more than one test of a kind (sibling pages, component variants), prefix with the subject: `login.story.test.ts`.

Scene runs at any level, since a page's own `update`/`view` pair drops into `scene` unmodified. Put a `scene.test.ts` in the page folder for behavior that page owns, which covers view states awkward to reach through the root Model, and keep a root-level `scene.test.ts` for flows that cross pages, which covers how the parent folds an OutMessage, a Command the parent lifts, a route change, and view inputs the parent computes. If the `repos/foldkit` subtree is available, study the `story.test.ts` and `scene.test.ts` files in `repos/foldkit/examples/`. `repos/foldkit/examples/auth` is the multi-page shape: a root `src/scene.test.ts` for the cross-page login flow alongside `src/page/loggedOut/page/login.scene.test.ts` and `login.story.test.ts` driving that page's own pair.

Story can deliver Messages while Commands are pending. Use `messageWith(model => Message.Variant(...))` when the Message needs the current Model at that step, and `Subscription.from(FeatureBlock.subscriptions).emit(entry, message)` for a decoded Subscription Message through its registered parent mapping.

When a Scene emits a Subscription Message, include the owning Composition and registered `subscriptions` in its config and call `Subscription.emit(entry, message)` with the exact registered entry. Each entry's `messages` collection declares the raw Messages accepted by that step. Select a bound entry when one source appears at multiple child placements. Silent `messages: []` entries accept no emissions. These steps do not start Streams or simulate Runtime activity and stale-generation admission.

Use `Scene.Command.keepPending(Definition | instance)` when a real interaction must occur before one ordinary Command completes. Its matcher must select one invocation; a bound instance selects its occurrence and args. The Command stays visible to assertions and resolvers, and must be resolved before the Scene ends. This changes only the later-Message boundary check.

## Code Style

- Encode state in discriminated unions, not booleans or nullable fields. `Idle | Loading | Error | Ok`, not `isLoading: boolean`. Make impossible states unrepresentable.
- Use `Option` for absence in the Model and domain values instead of `null` or `undefined`. Foldkit return records are the exception: omit `commands` and `outMessage` when absent. A partial `withOutMessagePolicy({ forward })` mapper returns `undefined` for each child variant that stops at this Block. Prefix Option-typed values with `maybe*`. Match with `Option.match`; don't unwrap with `Option.map(...)` + `Option.getOrElse(...)` when you can just match.
- Use Effect modules over native methods in `pipe` chains (`Array.map`, `String.startsWith`, `Array.findFirst`). Native methods are fine when calling directly on a named variable.
- Never cast Schema values with `as Type`. Use the callable constructor: `Message.SucceededLogin({ sessionId })`, not `{ _tag: 'SucceededLogin', sessionId } as Message`.
- Use `Array.match` for empty/non-empty branches. Use `Array.isReadonlyArrayEmpty` / `Array.isReadonlyArrayNonEmpty` for readonly Model collections, or the mutable predicates for mutable arrays; avoid `.length === 0` / `.length > 0`.
- Prefer `const` and pure collection transformations. Keep unavoidable mutation local to a tight algorithm or resource lifecycle; never hide workflow state in mutable module variables.
- Never use `T[]`. Always `Array<T>` or `ReadonlyArray<T>`.
- Author updates with exhaustive `makeUpdate` records. Branch on already-typed domain and Route variants through their owning union's guards and exhaustive `match`; use Effect `Match` for partial or grouped matches and unions without a matcher. Reserve Schema decoding or `Schema.is` for actual boundary validation. Never use `switch`.
- Use `Calendar` for date-only values and Effect `DateTime` / `Duration` for timestamps and elapsed time. Read the current time in a Command, Subscription, or Flags.
- Always use braces for control flow: `if (foo) { return true }`.
- Use direct `value === undefined` and `value !== undefined` comparisons for undefined checks.
- Use blank lines to show the phases of non-trivial control flow, and prefer a blank line when uncertain. Separate setup, a value read from the guard that consumes it, independent guards or validation cases, writes, and the final return. In a loop, give each skip, failure, or mutation condition its own visual paragraph. Keep statements together only when they form one operation or one explicit `if`/`else` chain. Preserve the required adjacency of a Composition and its ViewBuilder alias, and of `prepare` and its checked Block export. Formatting alone does not choose these logical boundaries; review them while authoring the code.
- Name selectors for derived values (`visibleIssues`), pure transitions for the Model change they describe (`applyWorkspaceSnapshot`), and dedicated handlers `handle<MessageTag>`. Use `init` for initialization functions, helpers, Steps and filenames, such as `initRoom`, `initRoomStep` and `init.ts`. Use `init...IfMissingStep` for conditional creation. Reserve `sync` and `observe` for actual synchronization or observation. Commands describe effects for Runtime; a Step only computes state and Commands.
- Don't add inline comments to explain code. Use better names instead. Reserve `// NOTE:` for behavior that would mislead a careful reader.

## Message Layout

Declare the whole Message union with `defineMessageUnion()`:

```ts
const Message = defineMessageUnion({
  ClickedSubmit: {},
  UpdatedEmail: { value: Schema.String },
})
```

When an explicit local annotation needs the decoded union, write `typeof Message.Type` directly. Definition, Composition, and completed Block helpers infer it from the Schema value, so do not add a routine colocated alias. Construct values through the namespace (`Message.ClickedSubmit()`) and handle local facts in the Composition's exhaustive `makeUpdate` record. Never destructure constructors from `Message` or `OutMessage`; the owning namespace stays visible at every call site.

Keep each case's payload object on one line when it fits. Let Oxfmt wrap payloads that need more space, so the declaration remains easy to scan as one variant per line.

Messages are verb-first past-tense. Common prefixes: `Clicked*`, `Updated*` (input changes and external state updates), `Submitted*`, `Pressed*`, `Selected*`, `Succeeded*` / `Failed*` (paired async results), and `Completed*` (every other Command result). Keep the authored Message local; child delivery variants are generated by the Composition.

## Debugging

This project ships with `@foldkit/devtools-mcp` pre-wired. When the dev server is running and the app is open in a browser, `foldkit_*` MCP tools let you inspect Model, Message history, and time-travel. The generated entry opts into external Message Schema discovery and dispatch with `devTools: { dispatch: true }`; Foldkit derives the Schema from the completed root Block, including generated child envelopes. Reach for those tools before adding `console.log` whenever the question is about state or Message flow.

Treat those tools as privileged access to the application. They can return Models, Message payloads, and Command and Mount arguments to the agent. Keep credentials and private data out of browser state. Use Effect `Redacted` for sensitive values the browser must temporarily hold, and set `devToolsMcpPort: false` in the Foldkit Vite plugin options when an agent should not inspect the running application.

## Going Deeper

For Blocks and OutMessage, Subscriptions, Mount / ManagedResource / CustomElement, field validation, routing, accessibility, and the full convention set, read the live Foldkit code in `repos/foldkit/`. The `examples/` directory and the production apps (`packages/typing-game/`, `packages/website/`) are the highest-fidelity references for any specific pattern. The `foldkit-skills` plugin's `generate-program` and `audit-program` skills carry written snapshot guides if you want a structured walkthrough.
