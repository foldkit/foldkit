# Block Composition and Layers

Read this reference when a Foldkit app defines a Block, holds child instances,
handles OutMessages, renders a child with a view input, keeps a per-instance
resource such as a socket, wires a Program, or provides Services and child
Layers. For exact types, inspect `packages/foldkit/src/blocks/` and a matching
example from the installed version. `examples/counter` and `examples/routing`
are compact references; `packages/foldkit/src/blocks/*.test.ts` show every
composition feature in one place.

## The ownership model

The Model is the single source of truth, and Blocks divide it by ownership.

- A Block owns its Model, Messages, update handlers, view, Commands, Mounts,
  and Subscriptions. Only its own update changes its Model.
- A parent owns which child instances exist. It holds them in its Model.
  Foldkit runs an instance's `start` Commands when it enters the Model, keeps
  its Subscriptions running while it is there, and stops them when it leaves.
- A parent talks to a child by sending it a Message (`send`) and listens by
  handling its OutMessages (`Child.on`). It reads child state through
  `model.child.model` and renders the child with `model.child.view()`. It
  never writes child fields.

A Block is a class. The class declares the contract, and `layer` implements
it. The Layer's constructor runs once, when the program's Layer is built: it
yields Services and returns the Block's module, which every instance of the
Block shares. An instance is plain data: `new Counter('left', { max: 10 })`
creates one anywhere, and `init` turns its args into its starting Model the
first time it appears in a Model. The root `Application` is an ordinary Block.

## Canonical shape

Declare Messages, OutMessages, Commands, and Mounts at module level, before the
class. The class lists them; nothing else registers them. In this sample,
`CountStore` is an application Service defined with `Context.Service`.

```ts
import { Effect, Number, Option, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Model = Schema.Struct({
  counterId: Schema.String,
  max: Schema.Number,
  count: Schema.Number,
  maybeError: Schema.Option(Schema.String),
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedIncrement: {},
  ClickedSave: {},
  RequestedReset: {},
  SucceededSaveCount: {},
  FailedSaveCount: { reason: Schema.String },
})
type Message = typeof Message.Type

const OutMessage = defineMessageUnion({ ReachedMax: {} })
type OutMessage = typeof OutMessage.Type

const SaveCount = Command.define('SaveCount', {
  args: { counterId: Schema.String, count: Schema.Number },
  messages: [Message.SucceededSaveCount, Message.FailedSaveCount],
})

export class Counter extends Block<Counter, Readonly<{ max: number }>>()(
  'Counter',
  { Model, Message, OutMessage, Command: [SaveCount] },
) {}

export const CounterLive = Counter.toLayer(
  Effect.gen(function* () {
    const store = yield* CountStore

    return {
      init: ({ max }, { id }) => ({
        counterId: id,
        max,
        count: 0,
        maybeError: Option.none(),
      }),
      update: {
        ClickedIncrement: model => {
          const nextCount = Number.increment(model.count)
          const nextModel = modifyFields(model, { count: () => nextCount })

          if (nextCount === model.max) {
            return { model: nextModel, outMessage: OutMessage.ReachedMax() }
          } else {
            return { model: nextModel }
          }
        },
        ClickedSave: model => ({
          model,
          commands: [
            SaveCount({ counterId: model.counterId, count: model.count }),
          ],
        }),
        RequestedReset: model => ({
          model: modifyFields(model, { count: () => 0 }),
        }),
        SucceededSaveCount: model => ({
          model: modifyFields(model, { maybeError: () => Option.none() }),
        }),
        FailedSaveCount: (model, { reason }) => ({
          model: modifyFields(model, { maybeError: () => Option.some(reason) }),
        }),
      },
      commands: {
        SaveCount: ({ counterId, count }) =>
          store.save(counterId, count).pipe(
            Effect.as(Message.SucceededSaveCount()),
            Effect.catch(error =>
              Effect.succeed(
                Message.FailedSaveCount({ reason: String(error) }),
              ),
            ),
          ),
      },
      view: (model, h) =>
        h.button(
          [h.OnClick(Message.ClickedIncrement())],
          [`${model.count}/${model.max}`],
        ),
    }
  }),
)
```

- `Block<Self, Args, ViewInput>()` takes the class itself, its instances' args
  (default `void`), and the input its view takes from a parent (default
  `void`). The string id matches the class name.
- The constructor passed to `layer` is an `Effect.gen` that runs once per
  Block. Yield Services there. Handlers close over them.
- The module is shared, so it holds nothing that belongs to one instance.
  Store per-instance data, including args and the id, in the Model through
  `init`, and pass it to Commands as Command args (`counterId` above).
- The constructor returns these fields:
  - `init`: `(args, { id, path }) => Model`, the starting Model of a new
    instance. `path` is the instance's ids from the root. Omit `init` for a
    Block without state.
  - `start`: `(model, args) => [Commands]`, run when an instance appears in
    the Model. Load data here, never in `init` or the constructor.
  - `update`: one handler per Message tag, plus spread `Child.on` entries for
    children. Each handler returns `{ model, commands?, outMessage?, messages? }`.
  - `commands` and `mounts`: one handler per listed Command and Mount.
  - `subscriptions`: Model-dependent Streams,
    `{ name: { dependencies: model => ..., stream: dependencies => Stream } }`.
    Each runs while its instance is in the Model and restarts when its
    dependencies change. An event source for the instance's whole life uses a
    dependency that never changes, such as an id from the Model.
  - `view`: `(model, h, input?) => Html`. The root view returns
    `{ title, body }`.
- A Command or Mount listed on the class without a handler fails at runtime.

## Hold children in the Model

A parent creates instances with `new Child(id, args)` and stores them in its
Model, usually in `init` or in an update handler. The child class itself is
the Schema for that field, not `Child.Model`.

```ts
export class Board extends Block<Board>()('Board', {
  Model: Schema.Struct({
    summary: Counter,
    maybeBonus: Schema.Option(Counter),
    rows: Schema.Array(Counter),
    nextRowId: Schema.Number,
  }),
  Message: defineMessageUnion({
    ClickedShowBonus: {},
    ClickedAddRow: {},
  }),
}) {}

export const BoardLive = Board.toLayer(() => ({
  init: () => ({
    summary: new Counter('summary', { max: 10 }),
    maybeBonus: Option.none(),
    rows: [],
    nextRowId: 0,
  }),
  update: {
    ClickedShowBonus: model => ({
      model: modifyFields(model, {
        maybeBonus: () => Option.some(new Counter('bonus', { max: 1 })),
      }),
    }),
    ClickedAddRow: model => ({
      model: modifyFields(model, {
        rows: Array.append(new Counter(`row-${model.nextRowId}`, { max: 3 })),
        nextRowId: Number.increment,
      }),
    }),
    ...Counter.on({
      ReachedMax: (model, _, counter) => ({
        model: modifyFields(model, {
          rows: Array.filter(({ id }) => id !== counter.id),
        }),
      }),
    }),
  },
  view: (model, h) =>
    h.div(
      [],
      [
        model.summary.view(),
        ...Array.map(model.rows, counter =>
          h.keyed('section')(counter.id, [], [counter.view()]),
        ),
      ],
    ),
}))
```

- `new Child(id, args)` creates a value and runs nothing. Foldkit calls
  `init` when the instance first appears in a Model and runs its `start`
  Commands then. Removing it from the Model stops its Subscriptions and
  in-flight Commands.
- Foldkit identifies an instance by its path: the parent's path plus the
  instance id. Ids must be unique among one parent's children, wherever in
  the parent's Model they sit; a duplicate throws. Derive collection ids from
  a stable domain id or a counter in the Model.
- Store instances in Struct fields, `Option`, arrays, Records, and tagged
  union variants. Not in HashMap, HashSet, or class instances; convert those to
  arrays or Records.
- Key rendered collection items by `instance.id`.

## Handle OutMessages with `Child.on`

A child reports facts through its OutMessage. The parent handles them by
spreading `Child.on({ ... })` into its update record. One entry covers every
instance of that Block the parent's Model holds, so a parent spreads at most
one `on` or `onAll` per child Block.

```ts
update: {
  ...Counter.on({
    ReachedMax: (model, _, counter) => {
      if (counter.id === 'summary') {
        return {
          model,
          messages: [model.summary.send(Counter.Message.RequestedReset())],
        }
      } else {
        return { model: removeRow(model, counter.id) }
      }
    },
  }),
}
```

Each handler receives the parent Model, the OutMessage, and the instance that
reported it, and returns an ordinary update result. When instances of the same
Block need different handling, branch on `instance.id`. Name the variant in
every handler. Use `Child.onAll({ ... })` when the parent must handle every
variant the child reports; `on` drops the variants it does not name. To
forward a fact upward, the handler returns `outMessage` with a variant of the
parent's own declared OutMessage, such as
`{ model, outMessage: OutMessage.FilledBoard() }`.

A parent that must refuse some of a child's Messages while its own state
forbids them spreads `...Child.when((model, message) => boolean)`. A gated
Message from the child's view, Commands, or Subscriptions is dropped. Messages
the parent sends with `send` are not gated.

## Send Messages to children

A parent changes a child only by sending it a Message. Return the sends under
`messages`, built from the instance currently in the Model:

```ts
ClickedResetAll: model => ({
  model,
  messages: [
    model.summary.send(Counter.Message.RequestedReset()),
    ...Array.map(model.rows, counter =>
      counter.send(Counter.Message.RequestedReset()),
    ),
  ],
}),
```

For optional and collection instances, map the instances that exist:
`messages: Option.toArray(Option.map(model.maybeDialog, dialog => dialog.send(...)))`
or `Array.map(model.rows, counter => counter.send(...))`. Name these Messages
as facts: `Requested*` for a parent's request (`RequestedReset`,
`RequestedOpen`), `InformedOf*` for a notification (`InformedOfRouteChange`).
The child's update decides what each one means. Annotate a computed collection
with `ReadonlyArray<Send>` from `foldkit/block` when inference needs help.

## Render a child with a view input

When a parent renders a child with callbacks, such as a headless component's
`toView`, declare the input type as the third type parameter. The child's view
receives it as its third argument; the parent passes it to `view`.

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

// child view
view: (model, h, { toView }) =>
  toView(
    { button: childAttributes([h.OnClick(Toggle.Message.ClickedToggle())]) },
    model.isOn,
  )

// parent view
model.toggle.view({
  toView: (attributes, isOn) =>
    h.button([...attributes.button], [isOn ? 'On' : 'Off']),
})
```

Functions in the input run as the parent, so Messages they create are the
parent's. Attributes the child builds for the parent to spread use
`childAttributes(...)` from `foldkit/html`, so they keep the child's dispatch.
View input functions keep their identity across renders; pass stable functions
(module-level or memoized) when a child caches on them.

## Use a `@foldkit/ui` component

Stateful components are Block classes with a `Live` Layer:

```ts
// parent init
dialog: new Dialog.Dialog('dialog', { id: 'confirm-delete' }),

// update
ClickedDelete: model => ({
  model,
  messages: [model.dialog.send(Dialog.Dialog.Message.RequestedOpen())],
}),
...Dialog.Dialog.on({ Closed: model => ({ model }) }),

// view
model.dialog.view({ toView: ({ dialog, panel, isVisible }) => ... })
```

Provide `Dialog.DialogLive` to the parent's Layer. A component that depends on
another component provides it inside its own Layer (`DialogLive` already
provides Animation), so provide only the component you use.

A generic factory is called once at module scope and returns a class declared
with its implementation, so the class is its own Layer. A Combobox, Listbox,
Menu, or Toast class holds Animation instances, so provide `AnimationLive` too:

```ts
const ResultListbox = Listbox.make<Result>()
// parent init: listbox: new ResultListbox('listbox', { id: 'results' })
// Model field: listbox: ResultListbox
// Layer:       Layer.provide(ResultListbox), Layer.provide(AnimationLive)
```

## Keep a resource per instance

The module is shared, so a resource that belongs to one instance, such as a
socket per chat room, cannot live in a constructor variable. Pick one of two
forms.

A resource only a Stream reads is a Subscription that acquires it. The
Subscription holds it while the instance is in the Model and releases it when
the instance leaves or the dependencies change.

A resource Commands also use is a keyed Service: an Effect `RcMap` created
once in the Layer constructor, keyed by a value stored in the Model. The
Subscription holds a reference for as long as it runs, so the resource lives
exactly while the instance is in the Model, and Commands borrow it by key.

```ts
const SendChat = Command.define('SendChat', {
  args: { roomId: Schema.String, text: Schema.String },
  messages: [Message.SucceededSendChat, Message.FailedSendChat],
})

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
      update: {
        ClickedSend: (model, { text }) => ({
          model,
          commands: [SendChat({ roomId: model.roomId, text })],
        }),
        // ...
      },
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
      view,
    }
  }),
)
```

Construct the resource inside the acquire Effect, never before it. When a
Command runs while no instance holds the key, `RcMap.get` acquires a fresh
resource for the Command's scope; check the Model before returning such a
Command if that is wrong for the resource.

## Services and Layers

- A Layer constructor yields the Services it needs. Command, Mount, and
  Subscription handlers close over them and must return Effects with no
  remaining requirements.
- A Block's Layer requires the Services its constructor yields plus the Layer
  of every Block its Model Schema holds. Provide a child's Layer to every
  parent Layer whose Model holds it. If a child holds Blocks, provide those to
  the child's Layer first, or provide one merged Layer to the whole graph.
- `@foldkit/ui` components provide their own component dependencies.

`entry.ts` builds the Program:

```ts
const program = Program.make(Application, {
  layer: ApplicationLive.pipe(
    Layer.provide(Layer.mergeAll(PeopleLive, Dialog.DialogLive)),
    Layer.provide(ApplicationLayer),
  ),
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: Application.Message.ClickedLink,
    onUrlChange: Application.Message.ChangedUrl,
  },
  devTools: { dispatch: true },
})

Runtime.run(program)
```

The root's args are `{ url }` with `routing`, `{ flags }` with `Flags`, both,
or none; its `init` receives them. `ApplicationLayer` supplies ordinary
Services.

## Test a composed graph

`story` and `scene` from `foldkit/story` and `foldkit/scene` take a Layer,
optional root args, and steps, and run under `@effect/vitest`.

```ts
const application = ApplicationLive.pipe(Layer.provide(PeopleLive))

it.effect('ChangedUrl informs the People page', () =>
  story(
    application,
    { url: urlOrThrow('http://localhost/') },
    message(Message.ChangedUrl({ url: urlOrThrow('http://localhost/people') })),
    Command.expectHas(FetchPeople),
    Command.resolve(
      FetchPeople,
      People.Message.CompletedFetchPeople({ query: '', people: [] }),
    ),
    model(model => {
      expect(model.peoplePage.results._tag).toBe('Loaded')
    }),
  ),
)
```

- The Layer must provide exactly one root Block. Provide children with
  `Layer.provide`, not `Layer.merge`. Provide Services the constructors yield
  with `.pipe(Effect.provide(TestLayer))` on the returned Effect.
- Without `given`, the story starts from the root's `init` Model. The
  `start` Commands of that starting Model are not in the ledger. A child's
  `start` Commands are, as Commands of the update that put the child in the
  Model.
- Tests see the resolved Model: every instance appears as its own Model
  (`model.peoplePage.results`). `given` can set child state, and it may hold
  `new Child(...)` values to add instances.
- Deliver a child's Message with
  `message(Block.deliver(People, 'peoplePage', People.Message.SubmittedSearch()))`.
  The path is the instance's ids from the root: a collection item is
  addressed by its own id (`'row-1'`), and a nested instance lists every id,
  such as `['popover', 'animation']`. Subscription emissions are child
  Messages; deliver them the same way.
- `Command.resolve` routes a child's Command result back to the child that
  issued it. Scene's `Mount.resolve` does the same for Mounts.
- A Scene root cannot take a view input. Test such a Block through a small
  test-only parent Block that renders it.

## Review invariants

- The parent Model is the only record of which instances exist. No instance
  lives in a Ref, Service, or module variable.
- Messages, OutMessages, Commands, and Mounts are declared at module level and
  listed on the class. Every listed Command and Mount has a handler.
- Each Block, including its contract, class, and `Live` Layer, lives in one
  file named for it. A child Block lives in its own file and never imports its
  parent.
- Layer constructors yield Services and create shared resources such as an
  `RcMap`. They hold no per-instance state. Data loads through `start`
  Commands.
- Per-instance data lives in the Model and reaches Commands as Command args.
  Handlers capture no current time, Subscription dependencies, or DOM
  elements in the constructor.
- A parent changes a child only through `send`, reads it through
  `model.child.model`, and handles child facts through one `Child.on` or
  `Child.onAll` entry per child Block.
- Instance ids are unique among one parent's children. Instances are stored in
  Structs, `Option`, arrays, Records, or tagged variants, never HashMap or
  HashSet. Collections are keyed by `instance.id` in the view.
- Child-built attributes passed to a parent use `childAttributes`.
- Every Block a Model holds has its Layer provided to its parent's Layer, and
  test Layers use `Layer.provide`.
