# Foldkit Architecture Guide

> **Note:** This file is a snapshot of the architecture as practiced in the live Foldkit codebase. If anything here contradicts the project's `FOLDKIT.md`, `repos/foldkit/examples/`, or `repos/foldkit/packages/foldkit/src/blocks/`, the live code is canonical. The duplication is intentional so the skill works in downstream projects that haven't vendored the foldkit subtree.

## The TEA Loop

Every Foldkit app follows The Elm Architecture (TEA). A Message arrives: the user clicked a button, a timer fired, an HTTP response came back. The update handler for that Message receives the current Model and returns a new Model along with any Commands to execute. The view renders the new Model as HTML. When the user interacts with the view, it produces another Message, and the loop continues.

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
Model    Commands                                                |
  |               |                                              |
  |               +-> Runtime -----------------------------------+
  |                                                              |
  +-> view -> Browser -> user events ----------------------------+
  |       +-> Mounts -> Runtime ---------------------------------+
  |                                                              |
  +-> subscriptions -> Stream<Message> -> Runtime ---------------+
```

Commands are one-shot effects. Mounts do work while a rendered element exists and report Messages. `subscriptions` are Streams of Messages; a Subscription runs while its Block instance is in the Model and restarts when the Model-derived dependencies it reads change. The browser sends Messages when the user interacts with the DOM.

There are no escape hatches:

- **Model** is the single source of truth: an Effect Schema
- **Messages** are facts about what happened: past-tense, never imperative
- **update** handlers are pure functions of the Model and one Message
- **view** is a pure function: `(model, h) → Html`, where `h` is the builder the runtime supplies
- **Side effects** stay outside update and view. The Runtime performs Commands and manages Mount and Subscription lifecycles. Each reports results through Messages

## Blocks

A Block is a class. The class declares the contract: its Model, Message, OutMessage, and the Commands and Mounts it owns. `layer` implements it and returns an Effect Layer. Its constructor runs once per Block and returns the Block's module, which every instance shares. An instance is plain data, created with `new Counter('left', { max: 10 })` and held in a parent's Model. Every app has at least one Block, the root `Application`.

```ts
const Message = defineMessageUnion({
  ClickedSave: {},
  SucceededSave: {},
  FailedSave: { reason: Schema.String },
})
type Message = typeof Message.Type

const Save = Command.define('Save', {
  args: { counterId: Schema.String, count: Schema.Number },
  messages: [Message.SucceededSave, Message.FailedSave],
})

export class Counter extends Block<Counter, Readonly<{ max: number }>>()(
  'Counter',
  {
    Model: Schema.Struct({
      counterId: Schema.String,
      max: Schema.Number,
      count: Schema.Number,
    }),
    Message,
    OutMessage: defineMessageUnion({ ReachedMax: {} }),
    Command: [Save],
  },
) {}

export const CounterLive = Counter.toLayer(
  Effect.gen(function* () {
    const store = yield* CountStore

    return {
      init: ({ max }, { id }) => ({ counterId: id, max, count: 0 }),
      update: {
        ClickedSave: model => ({
          model,
          commands: [Save({ counterId: model.counterId, count: model.count })],
        }),
        SucceededSave: model => ({ model }),
        FailedSave: model => ({ model }),
      },
      commands: {
        Save: ({ counterId, count }) =>
          store.save(counterId, count).pipe(
            Effect.as(Message.SucceededSave()),
            Effect.catch(error =>
              Effect.succeed(Message.FailedSave({ reason: String(error) })),
            ),
          ),
      },
      view: (model, h) =>
        h.button([h.OnClick(Message.ClickedSave())], [`${model.count}`]),
    }
  }),
)
```

- Declare Messages, OutMessages, Commands, and Mounts at module level, before the class. The class lists them; nothing else registers them.
- The type parameters of `Block<Self, Args, ViewInput>()` are the class itself, its instances' args (default `void`), and the input its view takes from a parent (default `void`). The string id matches the class name.
- The constructor passed to `layer` is an `Effect.gen` that runs once per Block, when the program's Layer is built. Yield Services there and close over them in handlers. It holds nothing that belongs to one instance.
- The constructor returns the module `{ init, start?, update, commands?, mounts?, subscriptions?, view }`. `init: (args, { id, path }) => Model` builds a new instance's starting Model; copy into it every arg and id the Block needs later, and pass them to Commands as Command args (`counterId` above). Omit `init` for a Block without state and `update` for a Block without Messages.
- `commands` has one handler per listed Command and `mounts` one per listed Mount. Handlers must return an Effect with no remaining requirements. A listed Command or Mount without a handler fails at runtime.
- The root view returns `{ title, body }`. Every other view returns `Html`.

Use a Block when a feature owns interaction state, effects, or lifecycle. Pure domain functions and render-only helpers remain ordinary functions. Do not turn a render helper into a Block for structural symmetry.

## Core Invariants

### 1. update is pure

An update handler must be deterministic. Given the same Model and Message, it must always return the same result:

- No `Date.now()`, `Math.random()`, or any non-deterministic call
- No DOM access (`document.*`, `window.*`)
- No `console.log` or other I/O
- No `Effect.runSync` / `Effect.runPromise`
- No `async` / `await`
- No mutation of any kind

These operations belong in Commands, which return their results as Messages.

### 2. view is pure

The view takes the Model and the builder `h` and returns Html. It must not access external state, perform side effects, or close over mutable variables. Event handlers in the view dispatch Messages; they don't perform actions.

### 3. `init` and the Layer constructor do no asynchronous work

The Layer constructor yields Services. `init` returns an instance's starting Model synchronously, including any child instances it creates. Work that loads data, reads storage, or reads the clock belongs in a Command returned from `start`, which Foldkit runs when the instance appears in the Model:

```ts
export const PeopleLive = People.toLayer(() => ({
  init: ({ route }) => ({
    searchInput: routeSearchText(route),
    results: SearchResults.Loading(),
  }),
  start: model => [FetchPeople({ searchText: model.searchInput })],
  // ...
}))
```

A Ref or a Service may hold execution bookkeeping, such as worker availability or protocol request IDs. The Model and update own pending work shown to the user, selections, and submission rules. A `Ref` created in the Layer constructor is shared by every instance and must not become the source of truth for workflow decisions or state read by view.

### 4. Expected Command failures become Messages

Define each Command at module level with `Command.define(name, { args, messages })`, list it on the class, and implement it under `commands`. Convert expected failures to Messages with `Effect.catch(() => Effect.succeed(Message.FailedX(...)))` so update can handle them as facts. Defects follow the application's crash handling.

Study the live examples for canonical shapes:

- **With args, fallible** (HTTP fetch): `repos/foldkit/examples/weather/src/`
- **With args, storage**: `repos/foldkit/examples/todo/src/application.ts` (`SaveTodos`)
- **Reading the clock**: `repos/foldkit/examples/stopwatch/src/application.ts` (`DetermineStartTime`)
- **Interruptible**: `repos/foldkit/examples/interrupting-commands/src/application.ts` (`UploadFile` with `interrupt`)

### 5. Model encodes all possible states

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
type DataState = typeof DataState.Type

const Model = Schema.Struct({
  dataState: DataState,
})
type Model = typeof Model.Type
```

For **remote data specifically**, don't hand-roll the union. The `AsyncData` module ships it:

```ts
import { AsyncData } from 'foldkit'

const WeatherAsyncData = AsyncData.Schema(WeatherData, Schema.String)
type WeatherAsyncData = typeof WeatherAsyncData.schema.Type

const Model = Schema.Struct({
  weatherAsyncData: WeatherAsyncData.schema,
})
type Model = typeof Model.Type
```

That gives six states: `Idle`, `Loading`, `Refreshing`, `Failure`, `Stale`, `Success`. `Refreshing` carries the previous data while a reload runs, so a refetch doesn't blank the screen. `Stale` carries both the previous data and the new error, so a failed reload doesn't discard what the user was reading. A hand-rolled `Idle | Loading | Error | Ok` forces both of those regressions.

The module also supplies the operations: `AsyncData.match`, `matchData`, `isPending`, `hasData`, `getData`, `map`, `revalidate`, `revalidateOrLoad`, `loadIfMissing`, `zipWith`, `all`.

`match` hands each branch the bare value, with one exception:

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

Destructuring `({ data })` in `onSuccess` or `onRefreshing` is the easy mistake.

### 6. Messages are facts, not commands

Messages describe what happened, not what should happen. The update handler decides what to do:

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
type Message = typeof Message.Type
```

## Update

`update` is a record with one handler per Message tag. Each handler receives the Model and the exact Message and returns `{ model, commands?, outMessage?, messages? }`:

- `model`: the next Model.
- `commands`: Commands the Runtime performs later. Omit when there are none.
- `outMessage`: a fact this Block reports to its parent (child Blocks only).
- `messages`: Messages sent to child instances, built with `model.child.send(...)`.

```ts
update: {
  UpdatedQuery: (model, { value }) => ({
    model: modifyFields(model, { query: () => value }),
  }),
  SubmittedSearch: model => ({
    model: modifyFields(model, { results: () => SearchResults.Loading() }),
    commands: [FetchResults({ query: model.query })],
  }),
  CompletedFetchResults: handleCompletedFetchResults,
}
```

Return handler results directly. Extract a substantial single-Message handler into a function named `handle<MessageTag>` and pass it as the record value. Extracted handlers and Steps stay in the Block's file. When the Block grows too large to read in one file, extract a feature into a child Block in its own file instead of moving the record to `update.ts`.

Use `modifyFields` from `foldkit/struct` for immutable Model updates, including nested ones. Never spread or `Object.assign` an existing Model.

Give reusable Model-first transitions a descriptive name ending in `Step`, such as `refreshStep`, and sequence pure Steps with `Update.combineSteps` when a later Step should receive the Model an earlier one produced. Name an inline Step parameter `stepModel`. Call a single Step directly instead of wrapping it.

The module also carries a combinator for handlers that fan out after a mutation succeeds. `Update.refresh({ read, revalidate, write, load })` builds a Step that reloads a cache **only when it already holds data**, so a `Succeeded*` handler can list every possibly affected cache without fetching caches nobody has opened:

```ts
SucceededUpdateNote: (model, { note }) =>
  Update.combineSteps(model, [
    replaceNoteInCaches(note),
    refreshNoteStep(note.id),
    refreshAllNotesStep,
  ]),
```

`repos/foldkit/examples/route-transitions/src/` uses both. When the OutMessage is already known while constructing a new result, include it directly. Use `Update.withOutMessage` to attach one to an existing result or a value of type `OutMessage | undefined`.

## Children

A parent holds child instances in its Model. The child class itself is the Schema for that field.

```ts
export class Board extends Block<Board>()('Board', {
  Model: Schema.Struct({
    search: Search,
    maybeDialog: Schema.Option(Dialog),
    columns: Schema.Array(Column),
  }),
  Message,
}) {}

export const BoardLive = Board.toLayer(() => ({
  init: () => ({
    search: new Search('search', { placeholder: 'Find' }),
    maybeDialog: Option.none(),
    columns: [],
  }),
  update: {
    ClickedOpenDialog: model => ({
      model: modifyFields(model, {
        maybeDialog: () => Option.some(new Dialog('dialog', { id: 'confirm' })),
      }),
    }),
    ClickedAddColumn: (model, { columnId }) => ({
      model: modifyFields(model, {
        columns: Array.append(new Column(columnId, { isCollapsible: true })),
      }),
    }),
    ...Search.on({
      SubmittedQuery: (model, { query }) => ({
        model,
        messages: Array.map(model.columns, boardColumn =>
          boardColumn.send(Column.Message.InformedOfQuery({ query })),
        ),
      }),
    }),
    ...Column.on({
      RequestedRemove: (model, _, removedColumn) => ({
        model: modifyFields(model, {
          columns: Array.filter(({ id }) => id !== removedColumn.id),
        }),
      }),
    }),
  },
  view: (model, h) =>
    h.div(
      [],
      [
        model.search.view(),
        ...Array.map(model.columns, boardColumn =>
          h.keyed('section')(boardColumn.id, [], [boardColumn.view()]),
        ),
      ],
    ),
}))
```

- `new Child(id, args)` creates an instance value anywhere: in `init`, in an update handler, or in a test's `given`. It runs nothing by itself. Foldkit calls the child's `init` the first time the instance appears in a Model and runs its `start` Commands then.
- Foldkit identifies an instance by its path, the parent's path plus the instance id. Ids must be unique among one parent's children, across all of the parent's Model fields; a duplicate throws. Derive collection ids from a stable domain id.
- While an instance is in the Model, its Subscriptions run. When it leaves the Model, Foldkit stops its Subscriptions and interrupts its in-flight Commands.
- Instances can live in Struct fields, `Option`, arrays, Records, and tagged union variants. Not in HashMap, HashSet, or class instances; convert those to arrays or Records.
- The parent reads child state through `model.search.model`. It changes the child only by sending it a Message: `messages: [model.search.send(Search.Message.RequestedClear())]`. Name those Messages as facts: `RequestedClear` for a request, `InformedOfQuery` for a notification.
- The parent receives child facts by spreading `...Child.on({ Tag: (model, outMessage, instance) => result })` into its update record. One entry covers every instance of that Block the parent's Model holds; when two instances need different handling, branch on `instance.id`. Use `Child.onAll` to require a handler for every variant. A handler can return `outMessage` to report a fact to its own parent.
- A parent that must refuse some child Messages while its own state forbids them spreads `...Child.when((model, message) => boolean)`. Messages the parent sends with `send` are not gated.
- Render a child with `model.search.view()`. Never reach into a child's Model fields to change them from the parent.

`examples/auth/src/application.ts` holds its page instances inside tagged Model variants and swaps between them on login and logout. `examples/routing/src/application.ts` sends `InformedOfRouteChange` to a page instance.

### Choosing what a parent passes

Choose parent inputs by ownership. Pass current render data through the view input. Send an `InformedOf*` Message when an external event requires the child to transition, return a Command, or emit an OutMessage. View input changes do not dispatch Messages. Keep an independent editing baseline in the child Model when needed. Do not mirror parent data into a child merely to read it, and do not notify a child about a change it already applied.

### View input

When a parent renders a child with callbacks, such as a headless UI component's `toView`, declare the input type as the third type parameter and pass it to `view`:

```ts
type ToggleViewInput = Readonly<{
  toView: (
    attributes: Readonly<{ button: ReadonlyArray<ChildAttribute> }>,
    isOn: boolean,
  ) => Html
}>

export class Toggle extends Block<Toggle, void, ToggleViewInput>()('Toggle', {
  Model: Schema.Struct({ isOn: Schema.Boolean }),
  Message: defineMessageUnion({ ClickedToggle: {} }),
}) {}

// child:  view: (model, h, { toView }) =>
//           toView({ button: childAttributes([h.OnClick(Toggle.Message.ClickedToggle())]) }, model.isOn)
// parent: model.toggle.view({ toView: (attributes, isOn) => h.button([...attributes.button], [isOn ? 'On' : 'Off']) })
```

Functions in the input run as the parent, so Messages they create are the parent's. Attributes the child builds for the parent to spread use `childAttributes(...)` from `foldkit/html`, so they keep the child's dispatch. Pass stable functions (module-level or memoized) when the child caches on their identity.

### Per-instance resources

A Block's module is shared by every instance, so a resource that belongs to one instance, such as a socket per chat room, cannot live in a Layer constructor variable. Choose by who reads the resource.

When only a Stream reads it, a Subscription acquires it. The Subscription holds the resource while its instance is in the Model and releases it when the instance leaves or the dependencies change.

When Commands also use it, create an Effect `RcMap` once in the Layer constructor and key it by a value stored in the Model. A Subscription holds the key's reference for as long as the instance is in the Model, and Commands borrow the resource by key:

```ts
export const ChatRoomLive = ChatRoom.toLayer(
  Effect.gen(function* () {
    const makeWebSocket = yield* Socket.WebSocketConstructor
    const sockets = yield* RcMap.make({
      lookup: (roomId: string) =>
        Effect.acquireRelease(
          Effect.sync(() => makeWebSocket(`${CHAT_URL}/${roomId}`)),
          socket => Effect.sync(() => socket.close()),
        ),
    })

    return {
      init: ({ roomId }) => ({ roomId, messages: [] }),
      // update returns SendChat({ roomId: model.roomId, text })
      commands: {
        SendChat: ({ roomId, text }) =>
          RcMap.get(sockets, roomId).pipe(
            Effect.flatMap(socket => Effect.sync(() => socket.send(text))),
            Effect.scoped,
            Effect.as(Message.SucceededSendChat()),
          ),
      },
      subscriptions: {
        socketEvents: {
          dependencies: model => model.roomId,
          stream: (roomId: string) =>
            Stream.unwrap(
              Effect.map(RcMap.get(sockets, roomId), streamSocketEvents),
            ),
        },
      },
      // ...
    }
  }),
)
```

The socket opens when a `ChatRoom` instance enters the Model and closes when it leaves. Construct the resource inside the acquire Effect, never before it: `Effect.acquireRelease` registers the release only after the acquire body completes. `repos/foldkit/examples/websocket-chat/src/` is the full example.

## Flags: side effects that seed the starting Model

When the starting Model needs data from a side effect (current time, localStorage, browser APIs), use Flags, not module-level constants:

```ts
// WRONG: module-level side effect (non-deterministic and untestable)
const now = Date.now()

// RIGHT: Flags run as an Effect before the root's init
export const Flags = Schema.Struct({
  todos: Schema.Option(Todos),
})
export type Flags = typeof Flags.Type

export const flags = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  // ...read and decode
  return { todos: Option.some(todos) }
}).pipe(Effect.catch(() => Effect.succeed({ todos: Option.none() })))

export class Application extends Block<
  Application,
  Readonly<{ flags: Flags }>
>()('Application', { Model, Message, Command: [SaveTodos] }) {}

export const ApplicationLive = Application.toLayer(() => ({
  init: ({ flags }) => ({
    todos: Option.getOrElse(flags.todos, () => []),
    // ...
  }),
  // ...
}))
```

Wire it at the entry:

```ts
const program = Program.make(Application, {
  layer: ApplicationLive.pipe(Layer.provide(ApplicationLayer)),
  Flags,
  container: document.getElementById('root'),
})

Runtime.run(program, {
  flags: flags.pipe(Effect.provide(ApplicationLayer)),
})
```

Common uses:

- Reading from localStorage/sessionStorage (restoring saved state)
- Getting the current time or date
- Reading browser capabilities (`navigator.language`, `matchMedia`)

With routing too, the root's args are `Readonly<{ flags: Flags; url: Url }>`. `repos/foldkit/examples/todo/src/` and `repos/foldkit/examples/auth/src/` are the references.

When Flags restore a value that a Command saved to storage, define the persistence Schema once and use it for both decode and encode:

```ts
export const SavedBoardJsonString = Schema.fromJsonString(
  Schema.toCodecJson(SavedBoard),
)
```

`toCodecJson` turns the domain value into canonical JSON, then `fromJsonString` stringifies it. Leave it out and a field like `Schema.Option` writes Effect's runtime shape (`{_id:"Option",_tag:"None"}`) to storage. The next boot fails to decode it, the Flags `Effect.catch` falls back to the empty value, and the user's saved data looks gone.

## Services and Layers

- A Layer constructor yields the Services it needs. Command, Mount, and Subscription handlers close over them and must return Effects with no remaining requirements.
- A Block's Layer requires the Services its constructor yields plus the Layer of every Block its Model Schema holds. Provide a child's Layer to every parent Layer whose Model holds it. If a child holds Blocks, provide those to the child's Layer first, or provide one merged Layer to the whole graph.
- `@foldkit/ui` components provide their own component dependencies.
- The root `ApplicationLayer` (in `services.ts`) supplies ordinary Services: `Http.toLayer`, `BrowserKeyValueStore.layerLocalStorage`, `BrowserCrypto.toLayer`, and app-specific Services. A test alternative is `ApplicationTestLayer`.

Lifetimes stay distinct. Services and resources created in a Layer constructor last as long as the program and are shared by every instance. A Command Effect lasts for one dispatch. Subscription Streams run while their instance is in the Model and follow their dependencies. A Mount follows one DOM element. A handler must not capture current time, Command args, Subscription dependencies, or a DOM element in the constructor.

[Block composition and Layers](../foldkit/references/composition.md) covers Layer wiring and composed tests in more depth.

## Mounts

Use a Mount when work follows one rendered element and needs that live `Element`. For example, measuring a panel belongs in a Mount because `getBoundingClientRect()` must read the actual DOM node after insertion:

```ts
export const MeasurePanel = Mount.define('MeasurePanel', {
  messages: [Message.CompletedMeasurePanel],
})

// class:       Mount: [MeasurePanel]
// module:      mounts: {
//                MeasurePanel: ({ element }) =>
//                  Effect.sync(() =>
//                    Message.CompletedMeasurePanel({ height: element.getBoundingClientRect().height }),
//                  ),
//              }
// view:        h.div([h.OnMount(MeasurePanel())], [...])
```

A Mount with `args` receives them alongside `element` (`({ element, hostId }) => ...`), captured at mount and not refreshed across renders. Use `Mount.defineStream` when the element supplies an ongoing event Stream; keep listener or observer acquisition and cleanup inside the returned Stream so each element owns its own scope. `repos/foldkit/examples/charting/src/application.ts` (`MountChart`) shows a `defineStream` Mount that hands its element to a charting library.

If a Mount's handler doesn't read or write its element, you've misidentified the cause.

## Subscriptions

A Block receives Messages from an external event source through `subscriptions`. Each entry runs while its instance is in the Model. The runtime recomputes the entry's `dependencies` from the instance's Model after every update and restarts its Stream when they change.

A source that runs for the whole life of the instance depends on a value that never changes:

```ts
subscriptions: {
  navigationShortcutPresses: {
    dependencies: () => null,
    stream: () =>
      Dom.streamFromKeyBindings({
        bindings: [
          {
            keys: ['G', 'H'],
            mapEvent: () => Message.EnteredNavigationShortcut({ shortcut: 'GH' }),
          },
        ],
      }),
  },
},
```

A source gated by Model state derives its dependencies from the Model:

```ts
subscriptions: {
  stopwatchTicks: {
    dependencies: model => model.isRunning,
    stream: (isRunning: boolean) =>
      isRunning
        ? Stream.tick(Duration.millis(TICK_INTERVAL_MS)).pipe(
            Stream.drop(1),
            Stream.as(Message.Ticked()),
          )
        : Stream.empty,
  },
},
```

- `dependencies` extracts exactly the data the Stream needs, not the whole Model. When the Stream depends on per-instance data, such as a room id, read it from the Model here. Return `Stream.empty` when the condition is off.
- Map events to Messages inside the Stream (`Stream.map(event => Message.UpdatedRoom({ room: event }))`), not in update.
- Map Stream errors to a `Failed*` Message inside the Stream rather than letting them escape.
- An entry can declare `keepAliveEquivalence: (previous, next) => boolean` to keep its Stream running across dependency changes it considers equivalent; the Stream reads the latest dependencies through its second argument, `readDependencies`.
- Name the entry for the events it supplies, such as `keyboardPresses`, `systemThemeChanges`, or `stopwatchTicks`, not a generic `watch*`.
- A child's Subscriptions stop when the child leaves the Model. Gate an entire child by whether it is in the Model; gate one Stream with `dependencies`.

Canonical live examples:

- **Model-gated timer**: `repos/foldkit/examples/stopwatch/src/application.ts`
- **Always-on key bindings**: `repos/foldkit/examples/routing/src/application.ts` (`navigationShortcutPresses`)
- **Always-active keyboard input**: `repos/foldkit/examples/snake/src/`
- **Animation-frame ticks**: `repos/foldkit/examples/canvas-art/src/`
- **Socket events**: `repos/foldkit/examples/websocket-chat/src/`

## Choosing a lifecycle primitive

Pick by what causes the side effect:

- A Message just dispatched → a Command.
- A Block instance just appeared in the Model → a `start` Command.
- An element exists in the rendered tree, and the handler uses that element → a Mount.
- An external event source, for the instance's whole life or gated by Model state → a `subscriptions` entry.
- A stateful resource for one instance → a Subscription that acquires it, or an `RcMap` keyed service when Commands use it too. See Per-instance resources above.
- A native web component → `CustomElement`.

## One Foldkit module instance

Each client or server module graph must load one `foldkit` module instance. The Runtime's private definition checks and the HTML builder's render state live in that module instance. A linked package resolving another copy can fail at runtime even when its TypeScript types look compatible.

A reusable package that imports Foldkit declares `foldkit` as a peer dependency and as a development dependency for its own build. The application declares the linked package in its own `package.json` and builds with `@foldkit/vite-plugin`. Do not alias `foldkit` to different paths inside one graph. If the Vite plugin cannot reach a linked package through the application's dependency graph, add that package to `resolve.noExternal`. Use `pnpm why foldkit` from the application workspace to find an unexpected nested installation.

## View Identity and Keys

View functions are the differ's identity boundaries. `@foldkit/vite-plugin` brands every view function's return with that function's identity, so switching between branches that render through different view functions replaces the old subtree instead of patching it, even when both branch roots share a tag. Branches are never keyed.

Extract the arms into named view functions when a same-tag inline ternary must reset DOM state on switch. An inline `cond ? h.div(...) : h.div(...)` renders both arms through the enclosing function, so they share one identity and patch in place.

Write keys in exactly two places:

- **Mapped list items**, keyed by a stable Model id, never by array position. A collection of child instances is keyed by `instance.id`.
- **A shared view function rendering different entities at one position** (a detail page across slugs or ids), keyed by the entity id.

```ts
// Mapped list: key each row by its stable Model id
Array.map(model.items, item => h.keyed('li')(item.id, [...], [...]))

// Child instances: key by instance id
Array.map(model.rows, row => h.keyed('li')(row.id, [], [row.view()]))

// Shared view function across entities: key by the entity id
h.keyed('article')(model.selectedProduct.id, [...], [...])
```

Keys carry identity, never data. Never derive a key from displayed data to force a refresh when content changes:

```ts
// WRONG: the key restates displayed data, so every toggle tears the
// panel down, discarding focus, scroll, and any open details element
h.keyed('div')(`${model.isCardSelected}:${model.isTermsAccepted}`, [...], [...])

// RIGHT: no key; changed content patches in place
h.div([...], [...])
```

Always build with `@foldkit/vite-plugin`; without it, branch identity falls back to positional-plus-key semantics and every branch point needs a hand-written key.

## DOM and Effect Helpers

DOM operations and browser Streams use Foldkit's `Dom` module. Time, randomness, and delays use Effect's built-in services. The Effects compose in Commands; the Streams compose in `subscriptions` and Mounts.

### Foldkit `Dom` module

Import as `import { Dom } from 'foldkit'`.

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
| `Dom.streamFromKeyBindings(...)`   | Stream Messages from keyboard shortcuts                      |
| `Dom.animationFrameTicks`          | Stream elapsed milliseconds for each browser animation frame |

### Effect built-ins

Use these directly from the `effect` package for non-DOM concerns. Yield the Service in the Layer constructor when a handler needs it, so the handler has no remaining requirements.

| Need                  | Use                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Current time (millis) | `const clock = yield* Clock.Clock` in the Layer constructor, then `yield* clock.currentTimeMillis` in the handler         |
| Current calendar date | `yield* Calendar.today.local` (returns `CalendarDate`), usually in Flags                                                  |
| Random integer        | `yield* Random.nextIntBetween(min, max)`                                                                                  |
| UUID                  | `const crypto = yield* Crypto.Crypto` in the Layer constructor, `yield* Effect.orDie(crypto.randomUUIDv4)` in the handler |
| Delay                 | `yield* Effect.sleep(Duration.millis(500))`                                                                               |

Use these instead of raw `document.querySelector`, `setTimeout`, `Date.now()`, or `Math.random()`. Provide platform Layers such as `BrowserCrypto.toLayer` in `ApplicationLayer`.

## With and Without URL Routing

### Without routing

```ts
export class Application extends Block<Application>()('Application', {
  Model,
  Message,
}) {}

// entry.ts
const program = Program.make(Application, {
  layer: ApplicationLive,
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})

Runtime.run(program)
```

### With routing

The root's args are `{ url }` when the Program has routing. Parse that URL in the root's `init` and later URLs in the `ChangedUrl` handler, then store a typed `ApplicationRoute` in the Model. `Route.parseUrlWithFallback` accepts a full `Url`; `Route.parsePathWithFallback` accepts an origin-relative path with query parameters.

```ts
export class Application extends Block<Application, Readonly<{ url: Url }>>()(
  'Application',
  { Model, Message, Command: [NavigateInternal, LoadExternal] },
) {}

// entry.ts
const program = Program.make(Application, {
  layer: ApplicationLive.pipe(Layer.provide(PeopleLive)),
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: Application.Message.ClickedLink,
    onUrlChange: Application.Message.ChangedUrl,
  },
  devTools: { dispatch: true },
})

Runtime.run(program)
```

`onUrlRequest` fires when the user clicks a link; the Message receives a `UrlRequest` that update handles with `UrlRequest.match(request, { Internal, External })`. `onUrlChange` fires when the browser URL changes; the handler updates the route from the new URL. When a page Block needs to react, the root sends it `InformedOfRouteChange`. `repos/foldkit/examples/routing/src/application.ts` is the canonical shape, including `Transition.matchOrElse` for entered and stayed pages.

If a query value holds a return Route, decode and encode it through a Schema transformation passed to `Route.query`. Keep the application Route Schema plain so rendering, selectors, and Model serialization use the decoded Route.

### Scoped to a node (embedded widgets)

`Program.make` owns the page and requires a root view returning a Document. `Program.makeElement` creates a container-scoped Program whose root view returns `Html`. It has no `routing`, and the Runtime never touches the document `<head>` or the `<html>` element:

```ts
const program = Program.makeElement(Application, {
  layer: ApplicationLive.pipe(Layer.provide(ApplicationLayer)),
  container: document.getElementById('widget'),
})

Runtime.run(program)
```

Use `Runtime.embed(program)` when the host must mount, dispose, or communicate through Ports. The host never touches the Model. See `repos/foldkit/examples/embedding/` for the complete pattern.

### Server rendering

SSR and SSG hydrate with `Runtime.hydrate` from a client entry named by `ssr.clientEntry` in `vite.config.ts`, with `renderDocument` exported from `entry.server.ts` and no source `index.html`. Keep classes and Layers importable by tests and server rendering. Follow FOLDKIT.md and the installed `create-foldkit-app` template when the user asks for server rendering.

### Document metadata

With `Program.make`, the root view returns a `Document` (`{ title, lang?, dir?, canonical?, ogUrl?, body }`). The Runtime writes `title` to `document.title` after every render. Build `canonical` from the typed route in the Model, never from the address bar. `lang` and `dir` sync to the `<html>` element; `dir` is `TextDirection` from `foldkit/html`, a Schema over `'Ltr' | 'Rtl' | 'Auto'`. Both are optional; when a view omits one, the Runtime leaves that attribute alone.

With `Program.makeElement`, the Runtime does not manage the title or document metadata.

### How to choose

- App is a widget embedded on a page it does not own (must not touch the host `<head>`) → `Program.makeElement`
- The host application also needs to drive it (lifecycle, data in, values out) → `Program.makeElement` started with `Runtime.embed`, communicating through Flags and Ports
- App owns the page and mentions "pages", "navigation", "routes", URLs → `Program.make` with `routing` and a root taking `{ url }`
- App owns the page with no navigation → `Program.make` without routing
