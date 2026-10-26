# Foldkit Architecture Guide

> **Note:** This file is a snapshot of the architecture as practiced in the live Foldkit codebase. If anything here contradicts what `repos/foldkit/examples/` or `repos/foldkit/packages/foldkit/src/` actually do, the live code is canonical. The duplication is intentional so the skill works in downstream projects that haven't vendored the foldkit subtree.

## The TEA Loop

Every Foldkit app follows The Elm Architecture (TEA). A Message arrives. The user clicked a button, a timer fired, an HTTP response came back. The update function receives the current Model and the Message and returns a new Model along with any Commands to execute. The view function renders the new Model as HTML. When the user interacts with the view, it produces another Message, and the loop continues.

The complete cycle, including Mounts, Subscriptions, and ManagedResources:

```
          +------------------------------------------------------+
          |                                                      |
          ↓                                                      |
       Message                                                   |
          |                                                      |
          ↓                                                      |
  +---------------+                                              |
  |    update     |                                              |
  +-------+-------+                                              |
  ↓               ↓                                              |
Model    Command<Message>[]                                      |
  |               |                                              |
  |               +-> Runtime -----------------------------------+
  |                                                              |
  +-> view -> Browser -> user events ----------------------------+
  |       +-> Mounts -> Runtime ---------------------------------+
  |                                                              |
  +-> Subscriptions -> Stream<Message> -> Runtime ----------------+
  |                                                              |
  +-> ManagedResources -> lifecycle -----------------------------+
```

Effects that emit Messages feed them back into update. Commands are one-shot effects. Mounts perform work while a rendered element exists and report at least one Message. Subscriptions manage a Stream whose emissions can become Messages; a `Stream<never>` Subscription can instead maintain scoped work without dispatching. ManagedResources dispatch Messages when they're acquired, released, or fail to acquire. The Browser sends Messages when the user interacts with the DOM.

There are no escape hatches:

- **Model** is the single source of truth: an Effect Schema struct
- **Messages** are facts about what happened: past-tense, never imperative
- **update** is a pure function. It receives the current Model and a Message, then returns an `Update.Return<Model, Message>`
- **view** is a pure function: `(model, h) → Html`, where `h` is the builder the runtime supplies
- **Side effects** stay outside update and view. The Runtime performs Commands and manages Mount, Subscription, and ManagedResource lifecycles. Each reports results through Messages

## Core Invariants

### 1. update is Pure

The update function must be deterministic. Given the same Model and Message, it must always return the same result. This means:

- No `Date.now()`, `Math.random()`, or any non-deterministic call
- No DOM access (`document.*`, `window.*`)
- No `console.log` or other I/O
- No `Effect.runSync` / `Effect.runPromise`
- No `async` / `await`
- No mutation of any kind

These operations belong in Commands, which return their results as Messages.

### 2. view is Pure

The view function takes the Model and the builder `h`, and returns Html. It must not:

- Access external state
- Perform side effects
- Close over mutable variables
- Call functions with side effects

Event handlers in the view dispatch Messages. They don't perform actions directly.

### 3. Expected Command Failures Become Messages

Define Command identities with the named feature’s `makeCommand`, whose config declares `args` (optional), every result Message in `messages`, optional interruption behavior, and `handler`. The handler is a generator constructor; Foldkit applies `Effect.gen` internally. Service lookups in that generator run once while the application Layer is built. The returned invocation function runs afresh for every Command with its current args. Definitions omit `execute`. Compose `Fetch.layer` directly in the owning module's `EffectsLayer`. A constructor with no service lookup still uses `function* ()` and returns the invocation function directly. Do not add a fake `yield`; the recommended Foldkit Oxlint preset disables `require-yield` for this canonical constructor shape. Convert expected failures to Messages with `Effect.catch(() => Effect.succeed(Message.FailedX(...)))` so update can handle them as facts. Defects may still terminate the Effect and follow the runtime's crash path. Omit `handler` only for a contract whose implementation belongs to an external host; that definition has no `.layer` and the host passes its implementation constructor Effect to `toLayer`.

Always assign definitions to PascalCase constants. Never define a Command inline in a pipe chain. Definitions live in the feature whose update produces them, alongside update or in a feature-local `command.ts`. Create a standalone `<CommandName>Layer` binding only when that individual provider is intentionally public or independently reused outside `EffectsLayer` assembly. Let TypeScript infer Command return types. The `messages` array constrains the handler's return type at the type level.

For the canonical shapes, study the live examples directly. They stay synced with the API:

- **With args, fallible** (HTTP fetch): `repos/foldkit/examples/weather/src/command.ts` (`FetchWeather`)
- **With args, infallible** (random + return): `repos/foldkit/examples/kanban/src/command.ts` (`GenerateCardId`)
- **With args, storage**: `repos/foldkit/examples/kanban/src/command.ts` (`SaveBoard`)
- **Argless, DOM side effect**: `repos/foldkit/examples/kanban/src/command.ts` (`FocusAddCardInput`)

### 4. Model Encodes All Possible States

Use discriminated unions to make impossible states unrepresentable:

```ts
// WRONG: boolean flags allow impossible combinations
const Model = Schema.Struct({
  isLoading: Schema.Boolean,
  isError: Schema.Boolean,
  data: Schema.Option(Data),
  error: Schema.Option(Schema.String),
})

// RIGHT: each state is a distinct variant
const DataState = defineTaggedUnion({
  Idle: {},
  Loading: {},
  Error: { error: Schema.String },
  Ok: { data: Data },
})

const Model = Schema.Struct({
  dataState: DataState,
})
```

With booleans, you can have `isLoading: true` AND `isError: true`, an impossible state. With unions, you're always in exactly one state.

For **remote data specifically**, don't hand-roll the union. The `AsyncData` module ships it:

```ts
import { AsyncData } from 'foldkit'

const WeatherAsyncData = AsyncData.Schema(WeatherData, Schema.String)

const Model = Schema.Struct({
  weatherAsyncData: WeatherAsyncData.schema,
})
```

That gives six states, not four: `Idle`, `Loading`, `Refreshing`, `Failure`, `Stale`, `Success`. The two extra ones are the reason to use it. `Refreshing` carries the previous data while a reload runs, so a refetch doesn't blank the screen. `Stale` carries both the previous data and the new error, so a failed reload doesn't discard what the user was reading. A hand-rolled `Idle | Loading | Error | Ok` forces both of those regressions.

The module also supplies the operations: `AsyncData.match`, `matchData`, `isPending`, `hasData`, `getData`, `map`, `revalidate`, `revalidateOrLoad`, `loadIfMissing`, `zipWith`, `all`.

`match` hands each branch the bare value rather than the tagged variant, with one exception:

```ts
AsyncData.match(model.notesAsyncData, {
  onIdle: () => h.empty,
  onLoading: () => spinnerView,
  onRefreshing: data => listView(data),
  onFailure: error => errorView(error),
  onStale: ({ error, data }) => staleView(error, data),
  onSuccess: data => listView(data),
})
```

`onRefreshing`, `onFailure`, and `onSuccess` each take one bare value. `onStale` takes `{ error, data }` because it carries both. `onIdle` and `onLoading` take nothing at all, since there is no payload in those states. Destructuring `({ data })` in `onSuccess` or `onRefreshing` is the easy mistake. Read `foldkit/asyncData`'s `public.d.ts` for the full surface. `repos/foldkit/examples/weather/src/model.ts` declares the AsyncData contract; its `update.ts` demonstrates state transitions.

### 5. Messages Are Facts, Not Commands

Messages describe what happened, not what should happen. The update function decides what to do. Messages don't dictate the response:

```ts
// WRONG: imperative, tells the system what to do
const Message = defineMessageUnion({
  FetchData: {},
  SetFilter: { filter: Schema.String },
  ShowModal: {},
})

// RIGHT: past-tense, describes what happened
const Message = defineMessageUnion({
  ClickedRefresh: {},
  SelectedFilter: { filter: Schema.String },
  ClickedOpenModal: {},
})
```

## Update Return Types

`foldkit/update` names the shape so you don't have to:

```ts
import { Update } from 'foldkit'

const update = FeatureComposition.makeUpdate({
  ClickedIncrement: model => ({
    model: modifyFields(model, { count: count => count + 1 }),
  }),
})
```

`FeatureComposition.makeUpdate` preserves the handler requirements of Commands returned by every locally authored Message branch. Registered Bindings route generated child envelopes before local handlers run. The complete dispatch Schema lives on `FeatureComposition.Message` and the completed `FeatureBlock.Message`.

`Update.ReturnWithOutMessage<Model, Message, OutMessage>` is the Block counterpart, adding an optional `outMessage` field.

Update, init, Step, and component helper producers return `{ model }` when they statically create no Commands. When they compute a Commands collection, they return it directly without checking whether it is empty. Never write the literal `commands: []`.

Init constructs the baseline Model and may return initial Commands. Author it through the owning Composition as `ApplicationComposition.makeInit(fn)` or `FeatureComposition.makeInit(fn)`. The Composition checks parent-owned Model fields, assembles registered child startup, and preserves the callback's exact arguments, return type, requirements, and child evidence. Give it one concrete function signature; optional, default, and rest parameters are supported. Wrap an overloaded helper or callable object in a concretely typed callback. A generic Block factory closes over its type parameters outside init. Assembly checks the function with Flags, routing, final child evidence, and handler registration. Optional `boot` helpers are ordinary initial Steps called through a Binding after the child Model exists; Foldkit has no special Runtime boot phase. When an existing domain operation such as `requestOpen` or `requestRestore` already describes the transition, declare that Message-producing operation and call it through the Binding. Do not manufacture a separate startup-only Message when an existing Message already records the transition.

For a required exact direct child field, omit `init` when its initializer can be called without arguments. A required-argument initializer uses `init: { contextToArgs }`; `init: false` makes the parent supply that field. An unkeyed optional direct field remains parent-owned when `init` is omitted, while `init.contextToArgs` can choose `None` or automatic `Some(child)` creation. Plain tuple literals preserve contextual init parameters. Add an optional `ChildInitContext` Schema to the parent Definition when selectors share context for direct child initializer arguments. It contextually types owned `init.contextToArgs` and `init.instances` callbacks without parameter annotations. The Composition initializer returns a plan: `model` contains only parent-owned fields, `childInitContext` carries the decoded context when a selector uses it, `commands` contains parent Commands, and `steps` contains ordered parent Steps applied after the complete Model exists. ChildInitContext does not describe the current Block's own init arguments. The Composition calls selected children once in `bindings` order and filters Commands for children absent from the final Model. An exact keyed array using `field` and `key`, with optional `childField`, declares `init.instances` and `init.toItem`. A direct array's `toItem` returns the exact initialized child Model with the planned key; a wrapped array's returns the parent-owned wrapper containing that exact child Model and key. An exact `Option` of one closed keyed wrapper uses the same `field`, `key`, and `childField` Binding shorthand, but it does not support `init.instances`. Create that occurrence with the exact registered `Binding.init({ key, args, toParentModel })`. Custom storage and other dynamic creation use the same operation. It returns a passive, noncallable recipe. Return it directly from `Composition.makeInit` or `Composition.makeUpdate`, or preserve it through a parent Definition's `makeStep` producer. The Composition authoring boundary interprets it directly. The recipe exposes no `.model` or `.commands`. The compiler checks exact key, args, parent Model, requirements, and Binding requirement. Steps evolve the Model in their declared order. Their Commands join the same execution batch, so collection order does not sequence their completion. During checked execution, runtime validation checks the active composition frame, schema-equivalent child placement, and exactly one requested keyed occurrence, but the available runtime metadata cannot reconstruct the TypeScript distinction among required, optional, defaulted, and rest initializer parameters. Startup stays inside the Composition boundary rather than adding a Runtime phase. Ordinary Model construction remains available.

Binding folds and Binding-projected operations return connected Steps whose Model input carries the required registered graph. A typed call with a raw domain Model fails. Apply them to the contextual Model inside `Composition.makeUpdate` or include them in `Composition.makeInit` startup. Return or compose their opaque results intact; they expose no `.model` or `.commands` and cannot narrow to a useful `{ model }` return before checked execution. A raw recipe exposes only direct channels. The Composition authoring boundary consumes it while its graph is active and resolves registered policy into the final parent Command Message, requirements, and OutMessage channels. Derive exported parent contracts from the Composition-authored update or completed Block. A completed `FeatureBlock.operations.operation(model, ...args)` dispatches its produced Message through the Block's update, accepts the raw Block Model, and returns the readable executed result. Ordinary pure Steps remain directly callable. TypeScript may erase a connected Binding function's result through a method returning `void`; outside the graph, that call only constructs and discards passive configuration and executes no child work.

Return a keyed startup wrapper as a plain record, preserving the initialized child object in its child field. Do not reconstruct that child through the wrapper's Schema constructor. Composition constructs the full parent Model through its Schema after collecting these records.

Author an exhaustive `Composition.makeUpdate({ Tag: (model, message) => result })` record. Each case receives the contextual Model and exact Message payload, and operations retain the selected case's Command requirements and OutMessage contract. Use `makeUpdate.withContext(context => cases)` for additional dispatch arguments; the factory runs for local dispatch, not routed child-only delivery. Generic Step values inside that context factory may need `model => step(model)` for inference. Ordinary handlers return results directly; do not wrap every case with `makeStep`. A Model-preserving no-op record value is `makeNoopStep()`, not the bare factory.

`Composition.makeUpdate` accepts only an exhaustive handler record; its callback overload is removed. Use `makeUpdate({})` when there are no local Messages. Each handler receives `(model, message)`; name extracted single-Message handlers `handle<MessageTag>` and pass compatible handlers or Steps directly. Give every named Model-first Step value a descriptive name ending in `Step`, such as `refreshStep`. Give a purposeful transition factory that returns a Step an operation name ending in `Step` too. Factory methods, imported authoring helpers, named OutMessage folds and matchers, direct inline handlers, public operation keys, Message tags, and applied update-like results keep their established names. If one handler mixes connected Binding recipes with local results, author its local branches through Definition-owned Steps. A raw `{ model }` beside a connected recipe is rejected; ordinary raw-only handlers can return results directly. Do not hide errors with casts or broad return annotations: a later wrapper cannot recover channels already erased upstream.

Let `FeatureComposition.makeUpdate` infer each handler's returned Command requirements. Do not constrain a Command-producing handler or nested matcher to `Update.Return<Model, Message>` without its requirements; that fixes the channel to `never`. The same rule applies inside `Definition.makeStep` and `Definition.makeOutMessageFold`: their owner supplies contextual inputs while the returned values retain every inferred channel. A standalone matcher that is known to be pure may use `Update.Return<Model, Message>` or `Update.Step<Model, Message>` as its return generic. That contextual type also prevents nested literal tags from widening before a later assignment. When helpers or other matchers need a reusable return alias and any branch returns Commands, include the relevant requirements. Derive them with `Update.RequirementsOf<typeof update>` when the update contract is available, rather than from `EffectsLayer`, which may also contain lifecycle handlers that update never returns.

Use `Update.Return<Model, Message>` for an update that cannot emit an OutMessage. It prevents a result containing an OutMessage from entering code that would keep only its Model and Commands. A result with no `outMessage` can still be used where `Update.ReturnWithOutMessage<Model, Message, OutMessage>` is expected. The missing field means that update emitted no OutMessage. A hand-written plain-return type must preserve the `outMessage?: never` field.

When composing another update-shaped result, bind the whole result to a value named after the operation and access its fields through that value. Use `homeInit`, `dialogClose`, or a trailing underscore such as `init_` when the operation name collides with the function. Do not destructure or rename `model`, `commands`, or `outMessage`. Dot access does not prevent someone from ignoring `outMessage`; it keeps the operation and all of its returned fields visible together. Name a child fold's `write` parameter after the next child Model, such as `nextSettings`.

Pass optional Commands directly to APIs that accept them, such as `Command.mapMessages(homeInit.commands, toMessage)`. Use `result.commands ?? []` only when the next operation requires a concrete array for spreading, concatenating, execution, or an assertion.

An authored update supports `update(model, message, ...context)` for Runtime dispatch and `update(message)(model, ...context)` as an internal Step. Put the local Message constructor directly under `operations` for a public operation that forwards its payload into that Message. Assembly creates the callable operation without constructing a Message. A constructor with fields takes one constructor payload object followed by update context, with constructor defaults honored; an empty-fields constructor takes no payload placeholder. Keep a tuple producer under `operations` when public inputs need mapping, refinement, defaults, or an exact context tuple. Both forms pass the Message through update synchronously as part of the pure transition. Keep standalone Steps for internal Model transformations. Because `Update.combineSteps` accepts unary Steps, adapt an update with required dispatch context through an explicit unary function that supplies that context.

Parent-facing operation names describe the communication: `requestCloseMenu` produces `Message.RequestedCloseMenu`, `informJoined` produces `Message.InformedOfJoin`, and `informRouteChanged` produces `Message.InformedOfRouteChange`. Use `request*` for actions and `inform*` for notifications. Both enter child update; avoid silent `reflect*` Model synchronization. Keep an actual UI fact separate when it represents a different event.

Record-authored updates retain each selected Message handler's output contract, including exact Command requirements and OutMessages. A producer selecting several Messages retains their possible outputs; update utilities retain the union across all handlers. Calling a pure operation does not run effects from another branch. Precision depends on the visible return contracts of any extracted helpers.

Use `Update.combineSteps` when a later Step should receive the Model produced by an earlier Step. It takes two or more Steps. Do not wrap one Step in `Update.combineSteps`; call that operation directly. Name an inline Step parameter `stepModel` when combining several; it receives the Model from the preceding Step. Child composition goes through a registered Binding: connected creation returns a `binding.init({ key?, args, toParentModel, commands? })` recipe, Composition routes generated child envelopes through the Binding fold, and parent-driven operations use `binding.name(...)`. Use `delivery.when`, `delivery.toUpdateContext`, and custom keyed `keySchema` for parent delivery policy. A child whose Message Schema is `Schema.Never` needs no delivery policy.

For a child reset, prefer a Message-backed `requestReset` or domain operation and compose it with the parent's `makeFieldsStep` for parent-owned fields. Deliberate baseline initialization can return `Binding.init({ args, toParentModel })` through the parent's `makeStep`, preserving unrelated parent fields and every child init Command. Do not take only the child's initialized Model. Reinitialization does not establish a fresh occurrence generation or cancellation of pending work, and it is not a documented way to reset an active Dialog or resource lifecycle. The child operation owns those transitions.

Use `FeatureDefinition.makeFieldsStep(producer)` for owning field transformations, `FeatureDefinition.makeCommandsStep(producer)` for Commands with an unchanged Model, and `FeatureDefinition.makeOutMessageStep(producer)` for one declared OutMessage with an unchanged Model.

In a split feature, export the Step helpers used by the implementation from `definition.ts` and named-import them in implementation modules. In a colocated feature, destructure those helpers beside the Definition in the scope that uses them. Keep Definition-qualified calls when several Definitions in one module need visible ownership. Do not re-export authoring helpers from the feature barrel; export the completed Block there.

All three take callbacks, evaluated when the Step or handler is applied. An ordinary producer receives the current Model and, when authored as a Message-dependent handler, its exact Message. Use `.fromMessage(message => value)` for payload-only producers and `() => value` for fixed producers. Commands-only and OutMessage-only helpers preserve the incoming Model identity. `makeNoopStep()` stays unchanged; in an OutMessage fold, pass its factory point-free when appropriate.

Pass compatible Steps directly as handler-record values. Extracted Message-dependent producers need a precise Message variant contract when no surrounding handler record supplies it. Map payloads explicitly when constructing a different Message or OutMessage; do not pass a constructor that could forward the incoming `_tag`. Keep cohesive mixed transitions as direct results, and use the owning `makeStep` helper for reusable mixed, connected, initialization, delegated, or composed operations. Local branches mixed with connected recipes still need canonical Definition-owned results.

`Update.combineSteps` accepts unary non-emitting Steps and preserves its OutMessage rejection. Use `Update.withOutMessage` for an existing plain result or an optional OutMessage. Do not construct and immediately invoke local Steps solely for uniformity.

Inside a local `makeStep` callback, return results directly, including `{ model }` when unchanged. Do not construct and immediately apply another local Step merely for a branch. Keep reusable operations, sequential composition, and canonical local Steps needed when mixing local results with connected recipes.

When the OutMessage is already known while constructing a new result, include it directly: `{ model, commands, outMessage }`. Use `Update.withOutMessage` when attaching an OutMessage to an existing plain return or when the value has the type `OutMessage | undefined`. Pipe an existing return into the helper: `pipe(dialogClose, Update.withOutMessage(outMessage))`. When constructing the plain return in the same expression, pass it first: `Update.withOutMessage({ model, commands }, outMessage)`.

A child with OutMessages requires explicit policy selection. Inline an ordinary unkeyed policy as `ParentDefinition.makeBinding(ChildBlock, ...).withOutMessagePolicy({ fold: ParentDefinition.makeOutMessageFold(ChildBlock, handlers), forward: ParentDefinition.makeOutMessageForward(handlers) })`. Every fold passes the whole completed child explicitly, whether inline, extracted, adapted for keyed policy, or staged for reciprocal composition. Forwarding remains contextual when inline; pass the whole completed child to `makeOutMessageForward` for an extracted callable policy, keyed adapter, or staged reciprocal policy. Include `forward` only when the parent declares OutMessages and at least one child variant continues upward; return `undefined` for named variants that stop. Register the full policy-selected Binding. A derived parent OutMessage takes precedence over forwarding for that dispatch. Missing policy, missing or extra handlers, undeclared forwarded OutMessages, and unregistered sibling operations fail type checking.

Keep an ordinary one-way policy as one fluent declaration. For a self-referential or reciprocal policy, declare `FooBinding` first, author folds against the original operation-bearing Bindings, select `FooBindingWithOutMessagePolicy`, and register the selected value. Policy selection keeps the same child identity and does not start Layers, handlers, or lifecycle work.

The module also carries two combinators for handlers that fan out after a mutation succeeds:

- `Update.combineSteps(model, [step, step, ...])` sequences update steps over one Model, threading the Model through and collecting the Commands.
- `Update.refresh({ read, revalidate, write, load })` builds a step that reloads a cache **only when it already holds data**. When a cache is `Idle`, the step returns `{ model }` and does not load it. A `Succeeded*` handler can therefore list every possibly affected cache without fetching caches nobody has opened.

```ts
SucceededUpdateNote: ({ note }) =>
  Update.combineSteps(model, [
    replaceNoteInCaches(note),
    refreshNote(note.id),
    refreshAllNotes,
    showToast('Success', `Updated ${note.title}`),
  ])
```

`repos/foldkit/examples/route-transitions/src/update.ts` uses both.

For a package shipping declarations, name each ordinary public completed contract with a same-name interface extending the matching checked `FromAssembly*<typeof Model, typeof prepare>`, followed by `export const FeatureBlock: FeatureBlock = Block.assemble(prepare)`. Keep producer, interface, and value adjacent as one assembly unit. A reusable named generic `Completed` interface can provide that boundary for a generic factory. JavaScript-only applications retain the existing checked value annotation. Verify declaration emission for actual public entrypoints and external consumption; `noEmit` alone is insufficient and there is no reliable child-count threshold. Naming the header prevents repeated child expansion, but it does not guarantee arbitrary root serialization or seal deliberate ambient augmentation.

## Flags: Side Effects That Seed the Initial Model

When the initial Model needs data from a side effect (current time, localStorage, browser APIs), use Flags, not module-level constants:

```ts
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
const ApplicationComposition = ApplicationDefinition.makeComposition()

// WRONG: module-level side effect (non-deterministic and untestable)
const now = Date.now()
const unsafeInit = ApplicationComposition.makeInit(() => ({
  model: Model.make({ createdAt: now }),
}))

// RIGHT: Flags run as an Effect before init, result passed in
const Flags = Schema.Struct({
  createdAt: Schema.Number,
})

const flags = Effect.gen(function* () {
  const now = yield* Clock.currentTimeMillis
  return Flags.make({ createdAt: now })
})

const init = ApplicationComposition.makeInit((flags: typeof Flags.Type) => ({
  model: Model.make({ createdAt: flags.createdAt }),
}))
```

For a fresh browser boot, Flags are produced by an `Effect<typeof Flags.Type>`. The runtime executes it once before init and passes the result in. This keeps init pure while still allowing side effects to populate the initial Model. Common uses:

- Reading from localStorage/sessionStorage (restoring saved state)
- Getting the current time
- Reading browser capabilities (`navigator.language`, `matchMedia`)

When Flags restore a value that a Command saved to storage, define the persistence Schema once next to the saved Schema and use it for both decode and encode:

```ts
export const SavedBoardJsonString = Schema.fromJsonString(
  Schema.toCodecJson(SavedBoard),
)
```

`toCodecJson` turns the domain value into canonical JSON, then `fromJsonString` stringifies it. Leave it out and a field like `Schema.Option` writes Effect's runtime shape (`{_id:"Option",_tag:"None"}`) to storage. The next boot fails to decode it, the Flags `Effect.catch` falls back to the empty value, and the user's saved data looks gone. For a Schema that is already JSON-native, `toCodecJson` changes nothing on the wire, so composing it every time costs nothing.

Declare the root Model and Message through an ordinary Block Definition, establish the root graph as `ApplicationComposition`, assemble `ApplicationBlock`, then declare the `Flags` Schema in `Program.make` and pass the Program to `Runtime.run`:

```ts
import { Block, Program } from 'foldkit'

const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings,
})

const prepare = () =>
  ApplicationComposition.prepareBlock({ init, update, view, EffectsLayer })
const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)

const program = Program.make({
  block: ApplicationBlock,
  container: document.getElementById('root'),
  Flags,
})

Runtime.run(program.provide(ApplicationLayer), { flags })
```

Hydrated applications do not provide a browser Flags Effect. `Runtime.hydrate(program)` decodes the exact Schema-encoded Flags payload emitted by the server. `@foldkit/vite-plugin` compiles the shared deployment identity into Foldkit for coordinated client and server builds; separately orchestrated builds pass the same explicit `buildId` override to each artifact. Hydration compares that identity against the id the server stamped on the root before it reads the handoff at all. Missing or invalid server handoff data, and a page from another deployment, are fatal boot errors.

Leave a Flags service in the Effect requirements when the application root should choose or share its provider. Keep a service used by both Flags and handlers exposed from `ApplicationLayer` with `Layer.provideMerge`. A service may be private to `flags` only when startup deliberately owns it and no application environment needs to substitute or share it. The Runtime builds the resulting Layer eagerly on every start, before executing a fresh Flags Effect, init, or the first render, including a start that restores a preserved Model. `Runtime.hydrate` validates the server handoff before acquiring Layers. A construction failure stops startup before the first render. Do not also provide a root service inside `flags`: doing both builds it twice and hands the app two instances of whatever it holds.

An Element owns its Flags Effect because no separate Runtime call seeds it. Put both `Flags` and `flags` in the `Program.makeElement` config. The embedded widget example later in this guide shows the full shape.

## Layers

A feature's Composition owns its child and Mount graph. Its local
`EffectsLayer` supplies only handlers declared by that feature; registered
child Bindings contribute their selected handler and lifecycle graphs
automatically. The root `ApplicationLayer` supplies the ordinary HTTP, storage,
RPC, browser, and business Services that those recipes still require.

Compose local Command `.layer` recipes explicitly with `Layer.mergeAll`.
Commands have no closed owner registry. For a closed ManagedResource registry
whose entries all have attached handlers, compose
`managedResources.layer`. Use individual entry Layers
for selective or mixed host-owned composition. An owned Subscription registry
exposes `subscriptions.layer` when every entry has an attached handler. Merging
recipes does not construct handlers or acquire a managed handle. The Runtime
constructs handlers at startup and acquires each ManagedResource when its Model
condition becomes active.

Keep those responsibilities separate. Do not merge a registered child's Layer
again at its parent or flatten every handler into the entry point. Assembly
and `program.provide(ApplicationLayer)` remain passive; the Runtime builds
the graph once for each start and releases it when that run stops.

Read [Block composition and Layers](../foldkit/references/composition.md) when
the program defines handlers, composes child Blocks, selects host handlers,
replaces a feature recipe, or decides where a provider belongs. That reference
contains the ownership table, construction timing, root wiring, testing seam,
and non-obvious lifecycle constraints. Then inspect the matching installed
declarations and exemplar for exact APIs.

At a glance:

- Put attached handler recipes in the owning feature's `EffectsLayer`.
- Let registered Bindings carry child recipes and descendants.
- Put concrete shared providers in the root `ApplicationLayer`.
- Omit `handler` only for a contract deliberately supplied by a host.
- Keep workflow state in the Model; handler constructors may retain execution
  bookkeeping, connections, and service clients.
- Keep application, Command, Model-condition, and mounted-element lifetimes
  distinct.

## Mounts

Use a Mount when work follows one rendered element and needs that live `Element`. For example, measuring a panel belongs in a Mount because `getBoundingClientRect()` must read the actual DOM node after insertion:

```ts
export const MeasurePanel = FeatureDefinition.makeMount('MeasurePanel', {
  messages: [Message.CompletedMeasurePanel],
  handler: function* () {
    return ({ element }) =>
      Effect.sync(() =>
        Message.CompletedMeasurePanel({
          height: element.getBoundingClientRect().height,
        }),
      )
  },
})

export const mounts = [MeasurePanel]
export const EffectsLayer = MeasurePanel.layer
```

The view uses `h.OnMount(MeasurePanel())`. Put the Mount in `FeatureDefinition.makeComposition({ mounts })` and author the canonical view through that Composition; its builder receives the capability automatically. Immediately after the Composition, declare `type FeatureViewBuilder = Block.ViewBuilderFor<typeof FeatureComposition>` for ordinary feature-local helpers on the same mounted or child embedding path. Export it only when another file uses it. Give each helper only its meaningful Model, domain, or context parameters plus `h: FeatureViewBuilder`. Reusable helpers can use the general `HtmlBuilder<Message>` for ordinary content. Use `FeatureDefinition.makeMountStream` when the element supplies an ongoing event Stream; keep listener or observer acquisition and cleanup inside the returned Stream so each element owns its own scope.

The owner-specific `FeatureViewBuilder` alias preserves its Composition's Message, child, and Mount evidence and creates no runtime value. Its owner prefix is the exception to the standard `Model`, `Message`, and `OutMessage` names because a plain builder type import must identify the Composition whose capabilities it carries. A helper shared across Compositions can take `h: HtmlBuilder<ParentMessage>` for ordinary content. For Mount-bearing child Attributes, accept a typed caller-owned rendering callback; that callback closes over the actual inferred parent builder. A raw Mount requirement or broad builder annotation does not preserve the scoped Binding capability. Do not erase it with a cast.

Assemble each feature with its local Subscription registry. Include its parent-owned Binding in the parent Composition's `bindings`; composition collects child records and preserves their Message contracts automatically. Parent Subscription activation belongs in the Binding's `subscriptions.when` policy.

## The Block Pattern

A Block gives one feature its own state machine and effect boundary. Define its
contracts, fix its child and Mount graph in a named Composition, then assemble
that same Composition as a passive Block. The parent integrates the completed
Block through one registered Binding.

Read [Block composition and Layers](../foldkit/references/composition.md) before
creating or changing this graph. It provides the canonical four-stage shape
and decision tables for:

- choosing a view helper or Block;
- selecting direct, optional, keyed, wrapped, or custom child storage;
- routing child Messages and handling or forwarding OutMessages;
- initializing required, optional, keyed, and dynamically created children;
- declaring parent-driven operations and coordinating sibling Bindings;
- authoring views with the Composition's child and Mount capabilities;
- composing local handler recipes and root Service providers;
- organizing one graph assembly point without circular imports.

The short review rule is that each Block or Application has one Definition and
one named Composition, every selected Binding is registered exactly once, and
the parent owns integration policy while the child owns its state transitions.
Only the Runtime starts execution.

## Subscriptions

Subscriptions are model-driven streams. They automatically start and stop based on model state.

Build all Subscriptions owned by one Block in one `FeatureDefinition.makeSubscriptions(entry => ({ ... }))` registry. Add entries to that record as the feature grows. Extract substantial Stream implementations into focused helpers instead of creating another registry for the same owner. Distinct child Blocks retain their own registries. Use the Layer-backed `entry(handlerName, fields, callbacks)` form when its lifetime depends on the Model. For those Subscriptions, provide:

- A stable handler name. Distinct definitions in one application need distinct names even when their record keys differ.
- A `fields` map (the bare field map passed as `entry`'s second argument) naming every dependency. The builder calls `Schema.Struct(fields)` internally and infers the dependency type from this map. If an adapter already exposes a Struct, pass `dependenciesSchema.fields`, not the Struct itself.
- A `messages` collection in `callbacks` listing the exact Message Schemas the attached handler or external `toLayer` Stream can emit. Use `messages: []` when the scoped Stream emits no Messages; that declaration requires `Stream<never>`. Scene uses the Schemas to validate both the selected `Subscription.emit` source and its Message before applying parent mappings.
- A `modelToDependencies(model)` function that returns the parameters the stream needs. Wrap an absent dependency in `Option` at the field level. The runtime restarts the stream whenever the dependencies change.
- A `handler: function* () { return dependencies => stream }` field. Errors should be mapped to a `Failed*` Message inside the stream rather than thrown. Compose the owned registry’s `subscriptions.layer` in the owning module’s `EffectsLayer` when every entry has an attached handler. It preserves all constructor errors and Service requirements. Mixed host contracts have no registry `.layer`; the entry key `layer` is reserved. Individual entry Layers remain valid for selective assembly.

When an external generic Stream helper infers its Message from one callback and rejects another declared variant, annotate the callback that determines its result with the union this entry declares. Use `typeof Message.Type` when the entry declares the full Message union. Keep the entry's exact `messages` declaration; it still checks the resulting Stream.

Name the handler for the events or scoped behavior the entry supplies, such as `KeyboardPresses`, `SystemThemeChanges`, or `GameClockTicks`. The handler name identifies the Layer requirement. Keep the record key parallel, such as `keyboardPresses`, `systemThemeChanges`, or `gameClockTicks`; the key identifies the runtime registration and Stream scope. Several lifted registrations can share one definition and handler Layer while retaining distinct keys. The Model dependencies determine when its scope is active. Avoid generic `Watch*` names that identify only the input source. When Subscription declarations are split from Block assembly, that module exports the Block's one registry; compose `Feature.subscriptions.layer` directly in the feature's `EffectsLayer`. When the registry supplies every local handler, pass `EffectsLayer: subscriptions.layer` directly to `prepareBlock`. Create a standalone binding such as `KeyboardPressesLayer` only when that individual provider is intentionally public or independently reused outside `EffectsLayer` assembly. Use `Subscription.aggregate` at graph, adapter, or test boundaries that join independent records. Subscription lifecycle entries in DevTools are follow-up work.

For Layer-backed Subscriptions without local Model dependencies (keyboard listeners, window resize, animation frame ticks), pass the stable handler name, Message Schemas, and `handler: function* () { return () => stream }`. Use the cold `Dom.animationFrameTicks` Stream for animation frame ticks. The Subscription then stays active across local Model updates. Its parent can still gate it when lifted.

A silent Subscription can own scoped DOM state. Keep acquisition and cleanup inside the `Stream<never>` so dependency changes and runtime shutdown remove the owned style:

```ts
const subscriptions = FeatureDefinition.makeSubscriptions(entry => ({
  dragSelectionStyles: entry(
    'DragSelectionStyles',
    { isDragging: Schema.Boolean },
    {
      messages: [],
      modelToDependencies: model => ({ isDragging: model.isDragging }),
      handler: function* () {
        return ({ isDragging }) =>
          Stream.when(
            Stream.fromEffect(
              Effect.acquireRelease(
                Effect.sync(() => {
                  const styleElement = document.createElement('style')
                  styleElement.textContent =
                    ':root { user-select: none !important; }'
                  document.head.appendChild(styleElement)
                  return styleElement
                }),
                styleElement => Effect.sync(() => styleElement.remove()),
              ).pipe(Effect.flatMap(() => Effect.never)),
            ),
            Effect.sync(() => isDragging),
          )
      },
    },
  ),
}))
```

Canonical live examples:

- **Always-active keyboard input**: `repos/foldkit/examples/snake/src/application.ts`
- **Animation-frame-driven game tick**: `repos/foldkit/examples/canvas-art/src/application.ts`
- **Conditional WebSocket connection** (active only when a session exists): `repos/foldkit/examples/websocket-chat/src/managedResource.ts`
- **Production multi-stream pattern**: `repos/foldkit/packages/typing-game/client/src/page/room/subscription.ts`

## ManagedResources

A ManagedResource ties one acquired handle to Model state. Declare its accessor once through the owning Definition, register that same binding in the lifecycle entry, and import it in Commands that read the active value:

```ts
export const CameraStream =
  CameraDefinition.makeResource<MediaStream>()('CameraStream')

export const managedResources = CameraDefinition.makeManagedResources(
  entry => ({
    camera: entry('ManageCamera', CameraRequirements, {
      resource: CameraStream,
      modelToMaybeRequirements: model => model.maybeCamera,
      onAcquired: () => Message.AcquiredCamera(),
      onReleased: () => Message.ReleasedCamera(),
      onAcquireError: error =>
        Message.FailedAcquireCamera({ reason: String(error) }),
      handler: function* () {
        return { acquire: acquireCamera, release: releaseCamera }
      },
    }),
  }),
)
```

`CameraDefinition.makeResource` qualifies the local name with the Block ID. Give independently managed handles distinct local names because assembly treats one qualified resource key as one lifecycle identity. Use `ManagedResource.tag` only for a standalone registry with no Block Definition. Keep the accessor at module scope so entry registration and `.get` calls share one exported binding.

## One Foldkit module instance

Each client or server module graph must load one `foldkit` module instance. The Runtime's private definition checks and the HTML builder's render state live in that module instance. A linked package resolving another copy can therefore fail at runtime even when its TypeScript types look compatible.

A reusable package that imports Foldkit declares `foldkit` as a peer dependency and as a development dependency for its own build. The application declares the linked package in its own `package.json` and builds with `@foldkit/vite-plugin`. Do not alias `foldkit` to different paths inside one graph. If the Vite plugin cannot reach a linked package through the application's dependency graph, add that package to `resolve.noExternal` so its Foldkit imports are bundled with the application's copy. Use `pnpm why foldkit` from the application workspace to find an unexpected nested installation before changing application code or resource identities.

## View Identity and Keys

View functions are the differ's identity boundaries. `@foldkit/vite-plugin` brands every view function's return with that function's identity, so switching between branches that render through different view functions replaces the old subtree instead of patching it, even when both branch roots share a tag. Branches are never keyed. `if`/`else`, ternaries, Effect `Match`, and `switch` all behave the same way: each arm's view function carries its own identity, and continuity is structural.

Extract the arms into named view functions when a same-tag inline ternary must reset DOM state on switch. An inline `cond ? div(...) : div(...)` renders both arms through the enclosing function, so they share one identity and patch in place; two named functions give each arm its own identity.

Write keys in exactly two places:

- **Mapped list items**, keyed by a stable Model id, never by array position. Rows rendered by one row view function all share that function's identity, so the key is what distinguishes them.
- **A shared view function rendering different entities at one position** (a detail page across slugs or ids), keyed by the entity id, so switching entities resets DOM state instead of bleeding it across.

```ts
// Mapped list: key each row by its stable Model id
Array.map(model.items, item => keyed('li')(item.id, [...], [...]))

// Shared view function across entities: key by the entity id
keyed('article')(model.selectedProduct.id, [...], [...])
```

Keys carry identity, never data. A key answers which item or entity occupies a position, not what it currently shows. Never derive a key from displayed data to force a refresh when content changes:

```ts
// Wrong: the key restates displayed data, so every toggle tears the
// panel down, discarding focus, scroll, and any open details element
keyed('div')(`${model.isCardSelected}:${model.isTermsAccepted}`, [...], [...])

// Right: same thing on every render, no key; changed content patches in place
div([...], [...])
```

If a key can change while the same conceptual thing stays on screen, the key is doing change detection, and patching already does that. Always build with `@foldkit/vite-plugin`; without it, branch identity falls back to positional-plus-key semantics and every branch point needs a hand-written key.

## DOM and Effect Helpers

DOM operations and browser Streams use Foldkit's `Dom` module. Time, randomness, and delays use Effect's built-in services. The Effects compose in Commands, while the Streams compose in Subscriptions and Mounts.

### Foldkit `Dom` module

Import as `import { Dom } from 'foldkit'` (or `import * as Dom from 'foldkit/dom'`).

| Helper                             | What it does                                                 |
| ---------------------------------- | ------------------------------------------------------------ |
| `Dom.focus(selector)`              | Focus a DOM element by CSS selector                          |
| `Dom.advanceFocus(direction)`      | Move focus to the next/previous focusable element            |
| `Dom.scrollIntoView(selector)`     | Scroll an element into view                                  |
| `Dom.showDialog(selector)`         | Open a `<dialog>` element with `show()`                      |
| `Dom.closeDialog(selector)`        | Close a `<dialog>` element                                   |
| `Dom.clickElement(selector)`       | Programmatically click an element                            |
| `Dom.lockScroll` / `unlockScroll`  | Prevent / restore page scroll (e.g. behind modals)           |
| `Dom.inertOthers` / `restoreInert` | Toggle `inert` on siblings of an element (focus containment) |
| `Dom.detectElementMovement(...)`   | Observe an element for layout-affecting movement             |
| `Dom.waitForAnimationSettled(sel)` | Wait for CSS animations/transitions on an element to finish  |
| `Dom.animationFrameTicks`          | Stream elapsed milliseconds for each browser animation frame |

### Effect built-ins

Use these directly from the `effect` package for non-DOM concerns. No Foldkit wrapper is needed.

| Need                  | Use                                                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Current time (millis) | `yield* Clock.currentTimeMillis`                                                                                                              |
| Current calendar date | `yield* Calendar.today.local` (returns `CalendarDate`)                                                                                        |
| Random integer        | `yield* Random.nextIntBetween(min, max)`                                                                                                      |
| Random float          | `yield* Random.nextBetween(min, max)`                                                                                                         |
| UUID                  | `yield* Effect.orDie(crypto.randomUUIDv4)` after `const crypto = yield* Crypto.Crypto`; provide `BrowserCrypto.layer` at the application root |
| Delay                 | `yield* Effect.sleep(Duration.millis(500))`                                                                                                   |

Use these instead of raw `document.querySelector`, `setTimeout`, `Date.now()`, or `Math.random()`. They compose naturally inside a Command's attached handler. For canonical wiring, see `repos/foldkit/examples/kanban/src/command.ts` (`FocusAddCardInput` wraps `Dom.focus`, `GenerateCardId` requires `Crypto.Crypto`), `repos/foldkit/examples/kanban/src/services.ts` (the root composes `BrowserCrypto.layer`), and `repos/foldkit/examples/kanban/src/entry.ts` (the entry supplies `ApplicationLayer`). `repos/foldkit/examples/stopwatch/src/application.ts` shows `Clock.currentTimeMillis` inside an `Effect.gen`.

## With and Without URL Routing

`const ApplicationDefinition = Block.makeDefinition('Application', { Model, Message })` establishes root contracts. Every root then creates `ApplicationComposition = ApplicationDefinition.makeComposition({ bindings?, mounts? })`; use `makeComposition()` for a graphless app. Author init, update, and view through that Composition, then assemble `ApplicationBlock` with those implementation fields listed explicitly.

### Without Routing

```ts
import { Block, Program } from 'foldkit'

const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
const ApplicationComposition = ApplicationDefinition.makeComposition()

const prepare = () =>
  ApplicationComposition.prepareBlock({ init, update, view })
const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)

const program = Program.make({
  block: ApplicationBlock,
  container: document.getElementById('root'),
})

Runtime.run(program.provide(ApplicationLayer))
```

### With Routing

A routing init receives Flags, when declared, and the current URL. Add both Message constructors to `routing`:

```ts
const HomeBinding = ApplicationDefinition.makeBinding(HomeBlock, {
  field: 'home',
})

const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [HomeBinding],
})

const prepare = () =>
  ApplicationComposition.prepareBlock({ init, update, view })
const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)

const program = Program.make({
  block: ApplicationBlock,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: ApplicationBlock.Message.ClickedLink,
    onUrlChange: ApplicationBlock.Message.ChangedUrl,
  },
})
```

### Scoped to a Node (Embedded Widgets)

`Program.make` owns the page and requires a root Block whose view returns a Document. `Program.makeElement` creates a container-scoped Program from a root Block whose view returns Html and has no routing config:

```ts
const prepare = () =>
  ApplicationComposition.prepareBlock({ init, update, view })
const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)

const program = Program.makeElement({
  block: ApplicationBlock,
  container: document.getElementById('widget'),
})

Runtime.run(program.provide(ApplicationLayer))
```

Element Flags live in the `Program.makeElement` config. A host factory can turn initial data into a Flags Effect and provide the root Service Layer:

```ts
export const createElement = (container: HTMLElement, flags: Flags) =>
  Program.makeElement({
    block: ApplicationBlock,
    Flags,
    flags: Effect.succeed(flags),
    container,
  }).provide(ApplicationLayer)
```

Use `Runtime.embed(program)` when the host must mount, dispose, or communicate through Ports. The host never touches the Model. See `repos/foldkit/examples/embedding/` for the complete pattern.

### Document Metadata

With `Program.make`, the root `view` returns a `Document`. The Runtime writes `title` to `document.title` after every render. It never derives `canonical` from the address bar. Build the canonical from the typed route in the Model, where the application can decide which route and query values identify the page.

If no render supplies `canonical`, the runtime leaves a served `<link rel="canonical">` unchanged or keeps the document without one. Before the client first writes a canonical, it records the existing `href`. A later omission restores that value, or removes the element if the runtime created it. During hydration, the recorded value can be the initial route's server-rendered canonical, so omission means restore that baseline rather than remove every canonical.

`ogUrl` can be supplied independently. An omitted `ogUrl` uses an explicit `canonical`, and its restore or removal behavior is the same. `Server.renderToString` returns only a canonical supplied by the view and gives `ogUrl` the explicit canonical when `ogUrl` is omitted. It does not derive either field from `Request.url`.

With `Program.makeElement`, the Runtime does not manage the title or document metadata.

`lang` and `dir` sync to the `<html>` element, so an app that switches language at runtime drives them from the Model. `dir` is `TextDirection` from `foldkit/html`, a Schema over `'Ltr' | 'Rtl' | 'Auto'` that you can drop straight into a Model `Schema.Struct`, and the runtime writes it as the lowercase attribute value. Both fields are optional and have no default: when a view omits one, the runtime does not touch that attribute, leaving whatever value it currently holds, so a view that never sets it leaves the served HTML in place.

`onUrlRequest` fires when the user clicks a link. The Message receives a `UrlRequest` (a tagged union from the `Navigation` namespace) which you handle in update by matching on its `_tag`. `onUrlChange` fires when the browser URL changes (back/forward buttons); the handler updates the route from the new URL.

For the canonical update-handler shapes (the exact `UrlRequest` tag names, how to dispatch `pushUrl` vs an external load Command, and how to derive the route from a `Url`), see `repos/foldkit/examples/routing/src/update.ts`.

### How to Choose

- App is a widget embedded on a page it does not own (must not touch the host `<head>`) → `Program.makeElement`
- The host application also needs to drive it (lifecycle, data in, values out) → a `Program.makeElement` result started with `Runtime.embed`, communicating through Flags and Ports
- App owns the page and mentions "pages", "navigation", "routes", URLs → `Program.make` with routing config
- App owns the page with no navigation → `Program.make` without routing
