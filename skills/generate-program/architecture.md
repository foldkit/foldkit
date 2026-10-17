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

Define Command identities with the named feature’s `command`, whose config declares `args` (optional), every result Message in `messages`, optional interruption behavior, and `handler`. The handler is a generator constructor; Foldkit applies `Effect.gen` internally. Service lookups in that generator run once while the application Layer is built. The returned invocation function runs afresh for every Command with its current args. Definitions omit `execute`. Compose `Fetch.layer` directly in the owning module's `EffectsLayer`. A constructor with no service lookup still uses `function* ()` and returns the invocation function directly. Convert expected failures to Messages with `Effect.catch(() => Effect.succeed(Message.FailedX(...)))` so update can handle them as facts. Defects may still terminate the Effect and follow the runtime's crash path. Omit `handler` only for a contract whose implementation belongs to an external host; that definition has no `.layer` and the host passes its implementation constructor Effect to `toLayer`.

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
  weather: WeatherAsyncData.schema,
})
```

That gives six states, not four: `Idle`, `Loading`, `Refreshing`, `Failure`, `Stale`, `Success`. The two extra ones are the reason to use it. `Refreshing` carries the previous data while a reload runs, so a refetch doesn't blank the screen. `Stale` carries both the previous data and the new error, so a failed reload doesn't discard what the user was reading. A hand-rolled `Idle | Loading | Error | Ok` forces both of those regressions.

The module also supplies the operations: `AsyncData.match`, `matchData`, `isPending`, `hasData`, `getData`, `map`, `revalidate`, `revalidateOrLoad`, `loadIfMissing`, `zipWith`, `all`.

`match` hands each branch the bare value rather than the tagged variant, with one exception:

```ts
AsyncData.match(model.notes, {
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

const update = FeatureComposition.makeUpdate((model, message) =>
  Message.match(message, {
    // ...
  }),
)
```

`FeatureComposition.makeUpdate` preserves the handler requirements of Commands returned by every parent-owned Message branch. Registered Bindings claim and route their wrapper variants before the callback runs.

`Update.ReturnWithOutMessage<Model, Message, OutMessage>` is the Block counterpart, adding an optional `outMessage` field.

Update, init, Step, and component helper producers return `{ model }` when they statically create no Commands. When they compute a Commands collection, they return it directly without checking whether it is empty. Never write the literal `commands: []`.

Init constructs the baseline Model and may return initial Commands. Author it through the owning Composition as `ApplicationComposition.makeInit(fn)` or `FeatureComposition.makeInit(fn)`. The Composition checks parent-owned Model fields, assembles registered child startup, and preserves the callback's exact arguments, return type, requirements, and child evidence. Give it one concrete function signature; optional, default, and rest parameters are supported. Wrap an overloaded helper or callable object in a concretely typed callback. A generic Block factory closes over its type parameters outside init. Completion checks the function with Flags, routing, final child evidence, and handler registration. Optional `boot` helpers are ordinary initial Steps called through a Binding after the child Model exists; Foldkit has no special Runtime boot phase. When an existing domain operation such as `open` or `restore` already describes the transition, expose that Step instead. Do not manufacture a Message only to trigger startup behavior.

For a required exact direct child field, omit `init` when its initializer can be called without arguments. A required-argument initializer uses `init: { args }`; `init: false` makes the parent supply that field. Optional, keyed, and accessor storage remains parent-owned when `init` is omitted, with explicit `init.args` or `init.occurrences` choosing automatic presence. Plain tuple literals preserve contextual init parameters. Add an optional `Startup` Schema to the parent Definition when selectors share input. It contextually types owned `init.args` and `init.occurrences` callbacks without parameter annotations. The Composition initializer returns a plan: `model` contains only parent-owned fields, `startup` carries the decoded input when a selector uses it, `commands` contains parent Commands, and `steps` contains ordered parent Steps applied after the complete Model exists. The Composition calls selected children once in `childBindings` order and filters Commands for children absent from the final Model. An exact keyed array using `field` and `key`, with optional `childField`, declares `init.occurrences` and `init.toItem`. A direct array's `toItem` returns the exact initialized child Model with the planned key; a wrapped array's returns the parent-owned wrapper containing that exact child Model and key. Custom storage, intentional interleaved Command ordering, and dynamic creation use the exact registered `Binding.init({ key?, args, toParentModel, commands? })`. It returns a passive, noncallable recipe. Return it directly from `Composition.makeInit` or `Composition.makeUpdate`, or preserve it through a parent Definition's `step` producer. The Composition callbacks interpret it directly; a completed exposed operation interprets a recipe preserved by its Step. The recipe exposes no `.model` or `.commands`. The compiler checks exact key, args, parent Model, requirements, and Binding requirement. During checked execution, runtime validation checks the active composition frame, schema-equivalent child placement, and exactly one requested keyed occurrence, but the available runtime metadata cannot reconstruct the TypeScript distinction among required, optional, defaulted, and rest initializer parameters. Startup stays inside the Composition boundary rather than adding a Runtime phase. Ordinary Model construction remains available.

Binding folds and exposed operations return connected Steps whose Model input carries the required registered graph. A typed call with a raw domain Model fails. Apply them to the contextual Model inside `Composition.makeUpdate`, include them in `Composition.makeInit` startup, or preserve them through the parent Definition's `step` producer. Return or compose their opaque results intact; they expose no `.model` or `.commands` and cannot narrow to a useful `{ model }` return before checked execution. The Composition callbacks consume them while their graph is active. A completed `block.expose.operation(model, ...args)` carries its own graph, accepts the raw Block Model, and returns the readable executed result. Ordinary pure Steps remain directly callable. TypeScript may erase a connected function's result through a method returning `void`; outside the graph, that call only constructs and discards passive configuration and executes no child work.

Return a keyed startup wrapper as a plain record, preserving the initialized child object in its child field. Do not reconstruct that child through the wrapper's Schema constructor. Composition constructs the full parent Model through its Schema after collecting these records.

Inside `FeatureComposition.makeUpdate`, let the outer helper infer the Command requirement channel through `Message.match(message, handlers)`. An explicit `Message.match<Update.Return<Model, Message>>` fixes that channel to `never` and discards the handler requirements the application must provide. When helpers or other matchers need a reusable return alias and any branch returns Commands, include the relevant requirements. Derive them with `Update.RequirementsOf<typeof update>` when the update contract is available, rather than from `EffectsLayer`, which may also contain lifecycle handlers that update never returns.

Use `Update.Return<Model, Message>` for an update that cannot emit an OutMessage. It prevents a result containing an OutMessage from entering code that would keep only its Model and Commands. A result with no `outMessage` can still be used where `Update.ReturnWithOutMessage<Model, Message, OutMessage>` is expected. The missing field means that update emitted no OutMessage. A hand-written plain-return type must preserve the `outMessage?: never` field.

When composing another update-shaped result, bind the whole result to a value named after the operation and access its fields through that value. Use `homeInit`, `dialogClose`, or a trailing underscore such as `init_` when the operation name collides with the function. Do not destructure or rename `model`, `commands`, or `outMessage`. Dot access does not prevent someone from ignoring `outMessage`; it keeps the operation and all of its returned fields visible together. Name a child fold's `write` parameter after the next child Model, such as `nextSettings`.

Pass optional Commands directly to APIs that accept them, such as `Command.mapMessages(homeInit.commands, toParentMessage)`. Use `result.commands ?? []` only when the next operation requires a concrete array for spreading, concatenating, execution, or an assertion.

Use `Update.combine` when a later Step should receive the Model produced by an earlier Step. It takes two or more Steps. Do not wrap one Step in `Update.combine`; call that operation directly. Name an inline Step parameter `stepModel` when combining several; it receives the Model from the preceding Step. Child composition goes through a registered Binding: connected creation returns a `binding.init({ key?, args, toParentModel, commands? })` recipe, received Messages use `binding.fold`, and parent-driven operations use `binding.name(...)`.

When the OutMessage is already known while constructing a new result, include it directly: `{ model, commands, outMessage }`. Use `Update.withOutMessage` when attaching an OutMessage to an existing plain return or when the value has the type `OutMessage | undefined`. Pipe an existing return into the helper: `pipe(dialogClose, Update.withOutMessage(outMessage))`. When constructing the plain return in the same expression, pass it first: `Update.withOutMessage({ model, commands }, outMessage)`. Add `outMessage.forward` only when at least one child OutMessage should continue to the current Block's parent. For partial forwarding, match every child variant and return `undefined` for the variants that stop here. Omit `outMessage.forward` when every variant stops here. `outMessage.fold` still handles each variant locally, including variants that continue upward. Never add `outMessage.forward: () => undefined` only to change the fold's return type.

A child Binding handles local OutMessages through `outMessage.fold`. Add `outMessage.forward` only for variants that continue upward. A derived parent OutMessage takes precedence over direct forwarding for that dispatch.

The module also carries two combinators for handlers that fan out after a mutation succeeds:

- `Update.combine(model, [step, step, ...])` sequences update steps over one Model, threading the Model through and collecting the Commands.
- `Update.refresh({ read, revalidate, write, load })` builds a step that reloads a cache **only when it already holds data**. When a cache is `Idle`, the step returns `{ model }` and does not load it. A `Succeeded*` handler can therefore list every possibly affected cache without fetching caches nobody has opened.

```ts
SucceededUpdateNote: ({ note }) =>
  Update.combine(model, [
    replaceNoteInCaches(note),
    refreshNote(note.id),
    refreshAllNotes,
    showToast('Success', `Updated ${note.title}`),
  ])
```

`repos/foldkit/examples/route-transitions/src/update.ts` uses both.

## Flags: Side Effects That Seed the Initial Model

When the initial Model needs data from a side effect (current time, localStorage, browser APIs), use Flags, not module-level constants:

```ts
const Application = defineApplication({ Model, Message })
const ApplicationComposition = Application.makeComposition()

// WRONG: module-level side effect (non-deterministic and untestable)
const now = Date.now()
const unsafeInit = ApplicationComposition.makeInit(() => ({
  model: Model.make({ createdAt: now }),
}))

// RIGHT: Flags run as an Effect before init, result passed in
const Flags = Schema.Struct({
  createdAt: Schema.Number,
})
type Flags = typeof Flags.Type

const flags = Effect.gen(function* () {
  const now = yield* Clock.currentTimeMillis
  return Flags.make({ createdAt: now })
})

const init = ApplicationComposition.makeInit((flags: Flags) => ({
  model: Model.make({ createdAt: flags.createdAt }),
}))
```

For a fresh browser boot, Flags are produced by an `Effect<Flags>`. The runtime executes it once before init and passes the result in. This keeps init pure while still allowing side effects to populate the initial Model. Common uses:

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

Import `defineApplication` from `foldkit`. Declare the root Model and Message through `Application`, establish the root graph as `ApplicationComposition`, declare the `Flags` Schema in its `makeApplication` config, then pass the runtime input to `Runtime.run`:

```ts
import { defineApplication } from 'foldkit'

const Application = defineApplication({ Model, Message })
const ApplicationComposition = Application.makeComposition({ childBindings })

const application = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  EffectsLayer,
  Flags,
})

Runtime.run(application.provide(ApplicationLayer), { flags })
```

Hydrated applications do not provide a browser Flags Effect. `Runtime.hydrate(application)` decodes the exact Schema-encoded Flags payload emitted by the server. `@foldkit/vite-plugin` compiles the shared deployment identity into Foldkit for coordinated client and server builds; separately orchestrated builds pass the same explicit `buildId` override to each artifact. Hydration compares that identity against the id the server stamped on the root before it reads the handoff at all. Missing or invalid server handoff data, and a page from another deployment, are fatal boot errors.

Leave a Flags service in the Effect requirements when the application root should choose or share its provider. Keep a service used by both Flags and handlers exposed from `ApplicationLayer` with `Layer.provideMerge`. A service may be private to `flags` only when startup deliberately owns it and no application environment needs to substitute or share it. The Runtime builds the resulting Layer eagerly on every start, before executing a fresh Flags Effect, init, or the first render, including a start that restores a preserved Model. `Runtime.hydrate` validates the server handoff before acquiring Layers. A construction failure stops startup before the first render. Do not also provide a root service inside `flags`: doing both builds it twice and hands the app two instances of whatever it holds.

An Element owns its Flags Effect because no separate runtime call seeds it. Put both `Flags` and `flags` in the `ApplicationComposition.makeElement` config. The embedded widget example later in this guide shows the full shape.

## Layers

A feature's Composition owns its child and Mount graph. Its local
`EffectsLayer` supplies only handlers declared by that feature; registered
child Bindings contribute their selected handler and lifecycle graphs
automatically. The root `ApplicationLayer` supplies the ordinary HTTP, storage,
RPC, browser, and business Services that those recipes still require.

Keep those responsibilities separate. Do not merge a registered child's Layer
again at its parent or flatten every handler into the entry point. Completion
and `application.provide(ApplicationLayer)` remain passive; the Runtime builds
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
export const MeasurePanel = Feature.mount('MeasurePanel', {
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

The view uses `h.OnMount(MeasurePanel())`. Put the Mount in `Feature.makeComposition({ mounts })` and author the canonical view through that Composition; its builder receives the capability automatically. Immediately after the Composition, declare `type FeatureViewBuilder = Block.ViewBuilderFor<typeof FeatureComposition>` for ordinary feature-local helpers on the same mounted or child embedding path. Export it only when another file uses it. Give each helper only its meaningful Model, domain, or context parameters plus `h: FeatureViewBuilder`. Reusable helpers independent of one owner keep the general `HtmlBuilder<Message>`. Use `Feature.mountStream` when the element supplies an ongoing event Stream; keep listener or observer acquisition and cleanup inside the returned Stream so each element owns its own scope.

The owner-specific `FeatureViewBuilder` alias preserves its Composition's Message, child, and Mount evidence and creates no runtime value. Its owner prefix is the exception to the standard `Model`, `Message`, and `OutMessage` names because a plain builder type import must identify the Composition whose capabilities it carries. Reusable helpers retain the framework's general `HtmlBuilder<Message>`.

Complete each feature with its local Subscription registry. Include its parent-owned Binding in the parent Composition's `childBindings`; composition collects child records and preserves their Message contracts automatically. Parent Subscription activation belongs in the Binding's `subscriptions.when` policy.

## The Block Pattern

A Block gives one feature its own state machine and effect boundary. Define its
contracts, fix its child and Mount graph in a named Composition, then complete
that same Composition as a passive Block. The parent integrates the completed
Block through one registered Binding.

Read [Block composition and Layers](../foldkit/references/composition.md) before
creating or changing this graph. It provides the canonical three-stage shape
and decision tables for:

- choosing a view helper or Block;
- selecting direct, optional, keyed, wrapped, or custom child storage;
- routing child Messages and handling or forwarding OutMessages;
- initializing required, optional, keyed, and dynamically created children;
- exposing parent-driven operations and coordinating sibling Bindings;
- authoring views with the Composition's child and Mount capabilities;
- composing local handler recipes and root Service providers;
- organizing one graph assembly point without circular imports.

The short review rule is that each Block or Application has one Definition and
one named Composition, every selected Binding is registered exactly once, and
the parent owns integration policy while the child owns its state transitions.
Only the Runtime starts execution.

## Subscriptions

Subscriptions are model-driven streams. They automatically start and stop based on model state.

Build them with `Feature.subscriptions(entry => ({ ... }))`. Use the Layer-backed `entry(handlerName, fields, callbacks)` form when its lifetime depends on the Model. For those Subscriptions, provide:

- A stable handler name. Distinct definitions in one application need distinct names even when their record keys differ.
- A `fields` map (the bare field map passed as `entry`'s second argument) naming every dependency. The builder calls `Schema.Struct(fields)` internally and infers the dependency type from this map.
- A `messages` collection in `callbacks` listing the exact Message Schemas the attached handler or external `toLayer` Stream can emit. Use `messages: []` when the scoped Stream emits no Messages; that declaration requires `Stream<never>`. Scene uses the Schemas to validate both the selected `Subscription.emit` source and its Message before applying parent mappings.
- A `modelToDependencies(model)` function that returns the parameters the stream needs. Wrap an absent dependency in `Option` at the field level. The runtime restarts the stream whenever the dependencies change.
- A `handler: function* () { return dependencies => stream }` field. Errors should be mapped to a `Failed*` Message inside the stream rather than thrown. Compose `subscriptions.key.layer` directly in the owning module's `EffectsLayer`.

Name the handler for the events or scoped behavior the entry supplies, such as `KeyboardPresses`, `SystemThemeChanges`, or `GameClockTicks`. The handler name identifies the Layer requirement. Keep the record key parallel, such as `keyboardPresses`, `systemThemeChanges`, or `gameClockTicks`; the key identifies the runtime registration and Stream scope. Several lifted registrations can share one definition and handler Layer while retaining distinct keys. The Model dependencies determine when its scope is active. Avoid generic `Watch*` names that identify only the input source. Compose the entry's attached recipe directly in `EffectsLayer`; create a standalone binding such as `KeyboardPressesLayer` only when that individual provider is intentionally public or independently reused outside `EffectsLayer` assembly. Subscription lifecycle entries in DevTools are follow-up work.

For Layer-backed Subscriptions without local Model dependencies (keyboard listeners, window resize, animation frame ticks), pass the stable handler name, Message Schemas, and `handler: function* () { return () => stream }`. Use the cold `Dom.animationFrameTicks` Stream for animation frame ticks. The Subscription then stays active across local Model updates. Its parent can still gate it when lifted.

A silent Subscription can own scoped DOM state. Keep acquisition and cleanup inside the `Stream<never>` so dependency changes and runtime shutdown remove the owned style:

```ts
const subscriptions = Feature.subscriptions(entry => ({
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

`const Application = defineApplication({ Model, Message })` establishes root contracts. Every root then creates `ApplicationComposition = Application.makeComposition({ childBindings?, mounts? })`; use `makeComposition()` for a graphless app. Author init, update, and view through that Composition, then complete it with those implementation fields listed explicitly.

### Without Routing

```ts
import { defineApplication } from 'foldkit'

const Application = defineApplication({ Model, Message })
const ApplicationComposition = Application.makeComposition()

const application = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  container: document.getElementById('root'),
})

Runtime.run(application.provide(ApplicationLayer))
```

### With Routing

A routing init receives Flags, when declared, and the current URL. Add both Message constructors to `routing`:

```ts
const HomeBinding = Application.bindChild(Home.block, {
  field: 'home',
  parentMessage: Message.GotHomeMessage,
})

const ApplicationComposition = Application.makeComposition({
  childBindings: [HomeBinding],
})

const application = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: request => Message.ClickedLink({ request }),
    onUrlChange: url => Message.ChangedUrl({ url }),
  },
})
```

### Scoped to a Node (Embedded Widgets)

`ApplicationComposition.makeApplication` owns the page and completes a Document view. `ApplicationComposition.makeElement` completes a container-scoped Html view and has no routing config:

```ts
const element = ApplicationComposition.makeElement({
  init,
  update,
  view,
  container: document.getElementById('widget'),
})

Runtime.run(element.provide(ApplicationLayer))
```

Element Flags live in the `makeElement` config. A host factory can turn initial data into a Flags Effect and provide the root Service Layer:

```ts
export const createElement = (container: HTMLElement, flags: Flags) =>
  ApplicationComposition.makeElement({
    init,
    update,
    view,
    Flags,
    flags: Effect.succeed(flags),
    container,
  }).provide(ApplicationLayer)
```

Use `Runtime.embed(program)` when the host must mount, dispose, or communicate through Ports. The host never touches the Model. See `repos/foldkit/examples/embedding/` for the complete pattern.

### Document Metadata

With `makeApplication`, the `view` returns a `Document`. The runtime writes `title` to `document.title` after every render. It never derives `canonical` from the address bar. Build the canonical from the typed route in the Model, where the application can decide which route and query values identify the page.

If no render supplies `canonical`, the runtime leaves a served `<link rel="canonical">` unchanged or keeps the document without one. Before the client first writes a canonical, it records the existing `href`. A later omission restores that value, or removes the element if the runtime created it. During hydration, the recorded value can be the initial route's server-rendered canonical, so omission means restore that baseline rather than remove every canonical.

`ogUrl` can be supplied independently. An omitted `ogUrl` uses an explicit `canonical`, and its restore or removal behavior is the same. `Server.renderToString` returns only a canonical supplied by the view and gives `ogUrl` the explicit canonical when `ogUrl` is omitted. It does not derive either field from `Request.url`.

With `makeElement`, the runtime does not manage the title or document metadata.

`lang` and `dir` sync to the `<html>` element, so an app that switches language at runtime drives them from the Model. `dir` is `TextDirection` from `foldkit/html`, a Schema over `'Ltr' | 'Rtl' | 'Auto'` that you can drop straight into a Model `Schema.Struct`, and the runtime writes it as the lowercase attribute value. Both fields are optional and have no default: when a view omits one, the runtime does not touch that attribute, leaving whatever value it currently holds, so a view that never sets it leaves the served HTML in place.

`onUrlRequest` fires when the user clicks a link. The Message receives a `UrlRequest` (a tagged union from the `Navigation` namespace) which you handle in update by matching on its `_tag`. `onUrlChange` fires when the browser URL changes (back/forward buttons); the handler updates the route from the new URL.

For the canonical update-handler shapes (the exact `UrlRequest` tag names, how to dispatch `pushUrl` vs an external load Command, and how to derive the route from a `Url`), see `repos/foldkit/examples/routing/src/update.ts`.

### How to Choose

- App is a widget embedded on a page it does not own (must not touch the host `<head>`) → `ApplicationComposition.makeElement`
- The host application also needs to drive it (lifecycle, data in, values out) → `makeElement` started with `Runtime.embed`, communicating through Flags and Ports
- App owns the page and mentions "pages", "navigation", "routes", URLs → `ApplicationComposition.makeApplication` with routing config
- App owns the page with no navigation → `ApplicationComposition.makeApplication` without routing
