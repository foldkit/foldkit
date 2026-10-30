# Block Composition and Layers

Read this reference when a Foldkit app defines a Block, holds child instances,
handles OutMessages, renders a child with a view input, shares a handle through
`expose`, wires a Program, or provides Services and child Layers. For exact
types, inspect `packages/foldkit/src/blocks/` and a matching example from the
installed version. `examples/counter` and `examples/routing` are compact
references; `packages/foldkit/src/blocks/*.test.ts` show every composition
feature in one place.

## The ownership model

The Model is the single source of truth, and Blocks divide it by ownership.

- A Block owns its Model, Messages, update handlers, view, Commands, Mounts,
  Streams, and Subscriptions. Only its own update changes its Model.
- A parent owns which child instances exist. It holds them in its Model, and
  an instance is live exactly while it is there.
- A parent talks to a child by sending it a Message (`send`) and listens by
  handling its OutMessages (`.on`). It reads child state through
  `model.child.model` and renders the child with `model.child.view()`. It
  never writes child fields.

A Block is a class. The class declares the contract, `make` implements it and
returns an Effect Layer, and the Layer provides the Block to every parent that
creates it. The root `Application` is an ordinary Block.

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
  args: { count: Schema.Number },
  messages: [Message.SucceededSaveCount, Message.FailedSaveCount],
})

export class Counter extends Block<Counter, Readonly<{ max: number }>>()(
  'Counter',
  { Model, Message, OutMessage, Command: [SaveCount] },
) {}

export const CounterLive = Counter.make(
  Effect.fn(function* (id, { max }) {
    const store = yield* CountStore

    return {
      model: { count: 0, maybeError: Option.none() },
      update: {
        ClickedIncrement: model => {
          const nextCount = Number.increment(model.count)
          const nextModel = modifyFields(model, { count: () => nextCount })

          if (nextCount === max) {
            return { model: nextModel, outMessage: OutMessage.ReachedMax() }
          } else {
            return { model: nextModel }
          }
        },
        ClickedSave: model => ({
          model,
          commands: [SaveCount({ count: model.count })],
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
        SaveCount: ({ count }) =>
          store.save(id, count).pipe(
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
          [`${model.count}/${max}`],
        ),
    }
  }),
)
```

- `Block<Self, Args, ViewInput, Exposed>()` takes the class itself, its
  constructor args (default `void`), the input its view takes from a parent
  (default `void`), and the value it exposes to its parent's Commands (default
  `never`). The string id matches the class name.
- The constructor passed to `make` is an `Effect.fn` that receives the
  instance id and args. It runs once per instance, synchronously, when the
  instance enters its parent's Model. Yield Services there.
- The constructor returns these fields:
  - `model`: the starting Model. Omit it for a Block without state.
  - `start`: Commands that run when the instance appears. Load data here; the
    constructor does no asynchronous work.
  - `update`: one handler per Message tag, plus spread `.on` entries for
    children. Each handler returns `{ model, commands?, outMessage?, messages? }`.
  - `commands` and `mounts`: one handler per listed Command and Mount.
  - `stream`: a Stream of this Block's Messages that runs for the life of the
    instance.
  - `subscriptions`: Model-dependent Streams,
    `{ name: { dependencies: model => ..., stream: dependencies => Stream } }`.
    The runtime restarts a Stream when its dependencies change.
  - `expose`: the value a parent's Commands read with `instance.use`.
  - `view`: `(model, h, input?) => Html`. The root view returns
    `{ title, body }`.
- A Command or Mount listed on the class without a handler fails at runtime.

## Declare children

A parent declares instances in its constructor and stores them in its Model.
The child class itself is the Schema for that field, not `Child.Model`.

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

export const BoardLive = Board.make(
  Effect.fn(function* () {
    const summary = yield* new Counter('summary', { max: 10 })
    const bonus = yield* new Counter('bonus', { max: 1 })
    const row = yield* Counter.each('rows', { max: 3 })

    return {
      model: { summary, maybeBonus: Option.none(), rows: [], nextRowId: 0 },
      update: {
        ClickedShowBonus: model => ({
          model: modifyFields(model, { maybeBonus: () => Option.some(bonus) }),
        }),
        ClickedAddRow: model => ({
          model: modifyFields(model, {
            rows: Array.append(row(`row-${model.nextRowId}`)),
            nextRowId: Number.increment,
          }),
        }),
        ...row.on({
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
    }
  }),
)
```

- `yield* new Child(id, args)` declares one instance. `yield* Child.each(collection, args)`
  returns a factory; `factory(key)` declares a keyed instance whose `id` is
  the key. Instance ids are unique within the parent.
- Declaring an instance constructs nothing. The instance is constructed when
  it enters the Model and stays live while it is there. Removing it closes its
  scope, which stops its Streams and Subscriptions and runs finalizers
  registered in its constructor. Putting the same declared instance back
  constructs it fresh, with a new starting Model.
- Store instances in Struct fields, `Option`, arrays, Records, and tagged
  union variants. Not in HashMap, HashSet, or class instances; convert those to
  arrays or Records.
- Key rendered collection items by `instance.id`.

## Handle OutMessages with `.on`

A child reports facts through its OutMessage. The parent handles them by
spreading `.on` entries into its update record. Use the instance form for one
instance and the factory form for every instance a factory creates.

```ts
update: {
  ...summary.on({
    ReachedMax: model => ({
      model,
      messages: [model.summary.send(Counter.Message.RequestedReset())],
    }),
  }),
  ...row.on({
    ReachedMax: (model, _, counter) => ({ model: removeRow(model, counter.id) }),
  }),
}
```

Each handler receives the parent Model, the OutMessage, and the instance that
reported it, and returns an ordinary update result. Name the variant in every
handler. To forward a fact upward, the handler returns `outMessage` with a variant of
the parent's own declared OutMessage, such as
`{ model, outMessage: OutMessage.FilledBoard() }`.

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
const dialog = yield* new Dialog.Dialog('dialog', { id: 'confirm-delete' })

// update
ClickedDelete: model => ({
  model,
  messages: [model.dialog.send(Dialog.Dialog.Message.RequestedOpen())],
}),
...dialog.on({ Closed: model => ({ model }) }),

// view
model.dialog.view({ toView: ({ dialog, panel, isVisible }) => ... })
```

Provide `Dialog.DialogLive` to the parent's Layer. A component that depends on
another component provides it inside its own Layer (`DialogLive` already
provides Animation), so provide only the component you use.

A generic factory is called once at module scope and returns a class with
`.Live`:

```ts
const ResultListbox = Listbox.makeBlock<Result>()
// constructor: yield* new ResultListbox('listbox', { id: 'results' })
// Model field:  listbox: ResultListbox
// Layer:        Layer.provide(ResultListbox.Live)
```

## Expose a handle

A Block can expose a value to its parent's Commands with `expose`, the fourth
type parameter. A parent Command handler reads it with `instance.use`, which
fails with `NotConnected` while the instance is not in the Model.

A stateful resource such as a socket is a child Block that acquires it in its
constructor with `Effect.acquireRelease`. The parent holds the child in an
`Option` field while the resource should exist; removing it runs the release.

```ts
export class Connection extends Block<
  Connection,
  Readonly<{ url: string }>,
  void,
  WebSocket
>()('Connection') {}

export const ConnectionLive = Connection.make(
  Effect.fn(function* (_id, { url }) {
    const socket = yield* Effect.acquireRelease(
      Effect.sync(() => new WebSocket(url)),
      socket => Effect.sync(() => socket.close()),
    )

    return { expose: socket }
  }),
)

// parent constructor
const connection = yield* new Connection('connection', { url })

// parent commands
SendChat: ({ text }) =>
  connection.use.pipe(
    Effect.flatMap(socket => Effect.sync(() => socket.send(text))),
    Effect.as(Message.SucceededSendChat()),
    Effect.catchTag('NotConnected', () =>
      Effect.succeed(Message.FailedSendChat({ reason: 'Disconnected' })),
    ),
  ),
```

Construct the resource inside the acquire Effect, never before it. The
acquisition is synchronous because constructors do no asynchronous work.

## Services and Layers

- A constructor yields the Services it needs. Command, Mount, and
  Subscription handlers close over them and must return Effects with no
  remaining requirements.
- A Block's Layer requires the Services its constructor yields plus the Layer
  of every Block it creates. Provide a child's Layer to every parent Layer that
  creates it. If a child creates Blocks, provide those to the child's Layer
  first, or provide one merged Layer to the whole graph.
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
or none. `ApplicationLayer` supplies ordinary Services.

## Test a composed graph

`story` and `scene` from `foldkit/story` and `foldkit/scene` take a Layer,
optional constructor args, and steps, and run under `@effect/vitest`.

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
- Without `given`, the story starts from the constructor's Model. `start`
  Commands of that starting Model are not in the ledger.
- Tests see the resolved Model: every instance appears as its own Model
  (`model.peoplePage.results`). `given` can set child state, for example with
  `People.Model.make(...)`, but cannot add or remove instances; do that with
  Messages.
- Deliver a child's Message with
  `message(Block.deliver(People, 'peoplePage', People.Message.SubmittedSearch()))`.
  Keyed instances use the path form `['rows', 'row-1']`, and nested instances
  list every id from the root, such as `['popover', 'animation']`. Stream and
  Subscription emissions are child Messages; deliver them the same way.
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
- Constructors are synchronous. Data loads through `start` Commands.
- Handlers close over constructor Services and capture no Command args,
  current time, Subscription dependencies, or DOM elements in the constructor.
- A parent changes a child only through `send`, reads it through
  `model.child.model`, and handles child facts through `.on`.
- Instances are stored in Structs, `Option`, arrays, Records, or tagged
  variants, never HashMap or HashSet. Collections are keyed by `instance.id`
  in the view.
- Child-built attributes passed to a parent use `childAttributes`.
- Every Block a graph creates has its Layer provided to its parent's Layer,
  and test Layers use `Layer.provide`.
