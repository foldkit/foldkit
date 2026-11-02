---
'foldkit': minor
---

Build applications from Blocks. A Block is a class that declares a feature's contract, plus a Layer that implements it. The Layer runs once per Block, yields the services the Block uses, and returns the Block's module, which every instance shares. An instance is plain data: `new Settings('settings')` creates one, a parent holds it in its Model, and Foldkit routes each instance's Messages back to it. Blocks replace `Runtime.makeApplication`, `Runtime.makeElement`, Submodels, the `Subscription` module, and `ManagedResource`.

The architecture does not change. The Model is the source of truth, Messages record facts, update is pure, and the Runtime performs the Commands update returns. What moves is where each piece is written:

- Command, Mount, and Subscription implementations move out of their definitions and into the module the Block's Layer returns, where they close over the services the Layer yields.
- `init` becomes the module's `init`, which returns an instance's starting Model, plus `start` for the Commands `init` used to return.
- Child wiring becomes instances held in the parent Model. The parent sends a child Messages and handles its OutMessages with `Child.on`. `Got*Message` wrappers, `toParentMessage`, and `Update.foldChild` go away.
- `Runtime.makeApplication(config)` becomes `Program.make(Application, { layer, ... })`, where the Layer provides the root Block, every Block its Model can hold, and the application's services.

Declare a Block with `class X extends Block<X>()('X', { Model, Message, OutMessage?, Command?: [...], Mount?: [...] }) {}`. The class contains no implementation. Declare the Message union and the Block's Commands at module level before the class, so Commands can name their result Messages. Optional type parameters after the class declare the args a parent passes to `new X(id, args)` and the view input a parent passes to `view`: `Block<X, Args, ViewInput>()`.

A Block's implementation goes inline, as the declaration's optional third argument, or in a separate Layer. Inline, `class X extends Block<X>()('X', contract, () => ({ ... }))` declares a class that is its own Layer: provide it with `Layer.provide(X)` and test it with `story(X, ...)`. `yield* X` returns its implementation, so another Layer can reuse or wrap it. Separately, `XLive = X.toLayer(...)` implements a class declared with the contract alone, or replaces an inline implementation.

Either form takes `() => ({ ... })` when the Block uses no services or `Effect.gen(function* () { ... })` when its handlers need services. Either runs once, when the program's Layer is built. The Effect form yields services and returns `{ init, start?, update, commands?, mounts?, subscriptions?, view? }`:

Write a Block's pieces inside the implementation, where they are inferred from the contract, or at module scope. In the `toLayer` form, `X.init`, `X.update`, `X.step`, `X.view`, `X.commands`, `X.mounts`, and `X.subscriptions` type module-scope pieces from the contract and return them unchanged. In the inline form, annotate module-scope pieces with the module's own `Model` and `Message` types, since the class is still being declared.

- `init(args, { id, path })` returns an instance's starting Model. Foldkit calls it when the instance first appears in a Model. Omit it only for a Block without a Model.
- `start(model, args)` lists Commands the Runtime performs when the instance appears. Load data here, never with asynchronous work in `init`.
- `update` has one handler per Message: `(model, message) => ({ model, commands?, outMessage?, messages? })`. A handler that changes nothing returns `{ model }`.
- `commands` and `mounts` implement every Command and Mount listed on the class. A listed Command or Mount without a handler is a type error. To swap what a Command does, for example in a test, provide a different Layer for a service its handler uses.
- `subscriptions` is a record of `{ dependencies, stream, keepAliveEquivalence? }` entries. Foldkit recomputes `dependencies` from the instance's Model after each update and restarts that entry's Stream when they change.
- `view` renders the instance with `(model, h)`, or `(model, h, input)` when the Block declares a view input.

The module has no per-instance state. Anything a handler needs about one instance, such as its id or the args it was created with, goes into that instance's Model through `init`, and a Command handler receives it through the Command's args.

A counter with a delayed reset shows the pieces:

```ts
// Before
const WaitBeforeReset = Command.define('WaitBeforeReset', {
  messages: [Message.CompletedWaitBeforeReset],
  execute: Effect.sleep('1 second').pipe(
    Effect.as(Message.CompletedWaitBeforeReset()),
  ),
})

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: { count: 0 },
})

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedResetAfterDelay: () => ({ model, commands: [WaitBeforeReset()] }),
    CompletedWaitBeforeReset: () => ({ model: { count: 0 } }),
  })

// After
const WaitBeforeReset = Command.define('WaitBeforeReset', {
  messages: [Message.CompletedWaitBeforeReset],
})

export class Application extends Block<Application>()('Application', {
  Model,
  Message,
  Command: [WaitBeforeReset],
}) {}

export const ApplicationLive = Application.toLayer(() => ({
  init: () => ({ count: 0 }),
  update: {
    ClickedResetAfterDelay: model => ({
      model,
      commands: [WaitBeforeReset()],
    }),
    CompletedWaitBeforeReset: () => ({ model: { count: 0 } }),
  },
  commands: {
    WaitBeforeReset: () =>
      Effect.sleep('1 second').pipe(
        Effect.as(Message.CompletedWaitBeforeReset()),
      ),
  },
  view,
}))
```

`Command.define` no longer accepts `execute`. It declares the Command's name, `args`, result `messages`, and optional `interrupt`. A handler must convert expected failures into result Messages, and the services it uses come from the Layer's Effect. `Mount.define` and `Mount.defineStream` move the same way: remove `execute`, list the Mount under `Mount: [...]`, and implement it under `mounts`. The view attaches it with `h.OnMount(...)` as before, and attaching a Mount the class does not list is a type error. A Command or Mount definition is a declaration only. Outside a Block, implement one with its `toLayer` method, which takes the handler, or an Effect that yields services and returns the handler, and returns a Layer that requires what the handler or Effect requires: `SaveCountLive = SaveCount.toLayer(Effect.gen(function* () { const store = yield* CountStore; return ({ count }) => ... }))`.

A Submodel becomes a child Block. The parent's Model Schema names the child class itself, the parent's `init` puts `new Child('id', args)` in its Model, and the parent's Layer provides the child's Layer:

```ts
// Before
export const Message = defineMessageUnion({
  ClickedResetSettings: {},
  GotSettingsMessage: { message: Settings.Message },
})

const foldSettings = Update.foldChild({
  update: Settings.update,
  read: (model: Model) => Option.some(model.settings),
  write: (model, settings) => modifyFields(model, { settings: () => settings }),
  toParentMessage: message => Message.GotSettingsMessage({ message }),
  foldOutMessage: Settings.OutMessage.match<Update.Step<Model, Message>>({
    ChangedTheme:
      ({ theme }) =>
      model => ({ model: modifyFields(model, { previewTheme: () => theme }) }),
  }),
})

// After
export class Application extends Block<Application>()('Application', {
  Model: Schema.Struct({ settings: Settings, previewTheme: Theme }),
  Message: defineMessageUnion({ ClickedResetSettings: {} }),
}) {}

export const ApplicationLive = Application.toLayer(() => ({
  init: () => ({
    settings: new Settings('settings'),
    previewTheme: 'System',
  }),
  update: {
    ClickedResetSettings: model => ({
      model,
      messages: [model.settings.send(Settings.Message.RequestedReset())],
    }),
    ...Settings.on({
      ChangedTheme: (model, { theme }) => ({
        model: modifyFields(model, { previewTheme: () => theme }),
      }),
    }),
  },
  view: (model, h) => h.main([], [model.settings.view()]),
})).pipe(Layer.provide(SettingsLive))
```

A parent and child meet in four places:

- The parent changes a child only by returning `messages: [model.child.send(Child.Message.Requested...())]`. A helper that rewrote a child's Model from the parent becomes a `Requested*` or `InformedOf*` Message on the child. The parent may read `model.child.model`, but it never writes it.
- The parent reacts to a child's OutMessages by spreading `...Child.on({ Variant: (model, outMessage, instance) => result })` into its update record. One entry covers every instance of that Block the parent's Model holds, and the third argument is the instance that reported. When two children of the same Block need different handling, branch on `instance.id`. Name each variant the parent handles. An OutMessage without a handler is dropped. The handlers take their types from the parent's update record, so a handler that returns a Command or OutMessage the parent does not declare is a type error, as it is in the parent's own Message handlers. `...Child.onAll({ ... })` requires a handler for every variant, so a variant added to the child is a type error in the parent until the parent handles it.
- The parent gates the Messages its children of one Block receive by spreading `...Child.when((model, message) => boolean)` into its update record. A Message from the child's view, Commands, or Subscriptions reaches the child's update only when the predicate returns true for the parent's current Model. Otherwise it is dropped. Messages the parent sends with `send` are not gated.
- The parent renders a child with `model.child.view()`. A child that renders through parent callbacks declares a view input and is rendered with `model.child.view(input)`. Functions in the input run as the parent, so the Messages they create are the parent's. `Submodel.defineView` and `h.submodel` are removed.

The Model decides which children exist. `new Child(id, args)` creates an instance anywhere, in `init` or in an update handler, and nothing runs until the instance appears in a Model. Then Foldkit calls the child's `init`, performs its `start` Commands, and starts its Subscriptions. When the instance leaves the Model, its Subscriptions stop and its in-flight Commands are interrupted. A Command result or sent Message addressed to an instance that is no longer in the Model is dropped.

Foldkit tracks an instance by its path: its parent's path plus its id. Moving an instance to another field of the same parent keeps its path, so it keeps its state and keeps running. An instance with a new id starts fresh from its `init`. Ids must be unique among one parent's children, across all of its fields; two children of one parent with the same id throw. Instances can live in plain objects, arrays, `Option`, and tagged structs, but not in `HashMap`, `HashSet`, or class instances.

A keyed collection, previously folded with `Update.foldChildAt`, becomes an array or Record of instances. Create each instance in the update handler that adds it, with a stable id and explicit args, and filter it out to remove it. `Row.on`, `Row.onAll`, and `Row.when` cover every Row in the collection. Key each instance by an identifier that stays with it, never by array position:

```ts
export class Table extends Block<Table>()('Table', {
  Model: Schema.Struct({ rows: Schema.Array(Row), nextRowId: Schema.Number }),
  Message: defineMessageUnion({ ClickedAddRow: {} }),
}) {}

export const TableLive = Table.toLayer(() => ({
  init: () => ({ rows: [], nextRowId: 0 }),
  update: {
    ClickedAddRow: model => ({
      model: modifyFields(model, {
        rows: Array.append(
          new Row(`row-${model.nextRowId}`, { label: 'New row' }),
        ),
        nextRowId: Number.increment,
      }),
    }),
    ...Row.on({
      RequestedRemoval: (model, _outMessage, removedRow) => ({
        model: modifyFields(model, {
          rows: Array.filter(({ id }) => id !== removedRow.id),
        }),
      }),
    }),
  },
  view,
})).pipe(Layer.provide(RowLive))
```

`Update.foldChild`, `Update.foldChildAt`, `Update.foldChildInit`, `Update.foldChildInits`, and `Update.foldChildStep`, with their `ChildFold*`, `Fold*`, and `FoldContext` types, are removed.

`Subscription.make`, `Subscription.aggregate`, `Subscription.lift`, `Subscription.persistentEntry`, `Subscription.animationFrameEntry`, and `Port.subscriptionEntry` are removed, along with the `foldkit/subscription` entry point. An event source is a `subscriptions` entry, whose `dependencies` no longer need a Schema. Return `Stream.empty` for dependencies that should produce no Messages. A source that runs for as long as the instance exists returns a value that does not change from `dependencies`, such as an id stored in the Model. Each instance's entries start and stop with it, so there is nothing to aggregate. Read an inbound Port with `Port.stream(port)` and map it to Messages in a `subscriptions` entry. Use `Dom.animationFrameTicks` for animation frames.

```ts
// Before
export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  ticks: entry(
    { isRunning: Schema.Boolean },
    {
      modelToDependencies: model => ({ isRunning: model.isRunning }),
      dependenciesToStream: ({ isRunning }) =>
        isRunning
          ? Stream.tick('1 second').pipe(Stream.as(Message.Ticked()))
          : Stream.empty,
    },
  ),
}))

// After, in the module the Layer returns
subscriptions: {
  ticks: {
    dependencies: model => model.isRunning,
    stream: (isRunning: boolean) =>
      isRunning
        ? Stream.tick('1 second').pipe(Stream.as(Message.Ticked()))
        : Stream.empty,
  },
},
```

`ManagedResource` and the `foldkit/managedResource` entry point are removed. A handle that should exist only while part of the Model exists is held by a Subscription. When only the Subscription's Stream reads the handle, acquire it inside the Stream with `Effect.acquireRelease`. When Commands also use it, the Block's Layer creates an Effect `RcMap` once. The Subscription holds the entry for a key stored in the instance's Model, and Command handlers borrow the same handle by that key, which update passes in the Command's args. The `onAcquired`, `onReleased`, and `onAcquireError` Messages become ordinary facts: update knows when it changes the Model, and events from the handle arrive as Messages from the Subscription.

```ts
export const SocketLive = Socket.toLayer(
  Effect.gen(function* () {
    const connections = yield* RcMap.make({
      lookup: (roomId: string) =>
        Effect.acquireRelease(
          Effect.sync(() => new WebSocket(`wss://chat.example.com/${roomId}`)),
          socket => Effect.sync(() => socket.close()),
        ),
    })

    return {
      init: ({ roomId }) => ({ roomId }),
      subscriptions: {
        receivedData: {
          dependencies: model => model.roomId,
          stream: (roomId: string) =>
            Stream.unwrap(
              RcMap.get(connections, roomId).pipe(
                Effect.map(socket =>
                  Stream.fromEventListener<MessageEvent>(
                    socket,
                    'message',
                  ).pipe(
                    Stream.map(event =>
                      Message.ReceivedData({ data: String(event.data) }),
                    ),
                  ),
                ),
              ),
            ),
        },
      },
      update: {
        RequestedSend: (model, { data }) => ({
          model,
          commands: [SendData({ roomId: model.roomId, data })],
        }),
        // ...
      },
      commands: {
        SendData: ({ roomId, data }) =>
          RcMap.get(connections, roomId).pipe(
            Effect.flatMap(socket => Effect.try(() => socket.send(data))),
            Effect.scoped,
            Effect.as(Message.SucceededSendData()),
            Effect.catch(() => Effect.succeed(Message.FailedSendData())),
          ),
      },
    }
  }),
)
```

A parent decides when the connection exists by holding the instance in an `Option` field: `Option.some(new Socket('socket', { roomId }))` starts the Subscription and opens the socket, and `Option.none()` stops it, interrupts any `SendData` still running, and closes the socket.

The root is an ordinary Block named `Application`. Its args declare what the host supplies: `{ flags }` when the Program declares `Flags`, `{ url }` with the starting URL when the Program has `routing`, or both. `Program.make` requires `Flags` for a root that takes `{ flags }` and `routing` for a root that takes `{ url }`. Pass the Flags Effect to `Runtime.run` as before:

```ts
// Before
const application = Runtime.makeApplication({
  Model,
  Flags,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: request => Message.ClickedLink({ request }),
    onUrlChange: url => Message.ChangedUrl({ url }),
  },
  resources: ApplicationLayer,
  devTools: { Message },
})

Runtime.run(application, { flags })

// After
export class Application extends Block<
  Application,
  Readonly<{ flags: Flags; url: Url.Url }>
>()('Application', { Model, Message }) {}

export const ApplicationLive = Application.toLayer(() => ({
  init: ({ flags, url }) => ({
    route: urlToRoute(url),
    theme: flags.theme,
  }),
  update,
  view,
}))

const program = Program.make(Application, {
  layer: ApplicationLive.pipe(Layer.provide(ApplicationLayer)),
  Flags,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: Application.Message.ClickedLink,
    onUrlChange: Application.Message.ChangedUrl,
  },
  devTools: { dispatch: true },
})

Runtime.run(program, { flags: flags.pipe(Effect.provide(ApplicationLayer)) })
```

`Program.make` creates a page-owning program and `Program.makeElement` a container-scoped one; pass either to `Runtime.run`, `Runtime.hydrate`, or `Runtime.embed`. Both also live at `foldkit/program`. Program options keep `container`, `Flags`, `routing`, `ports`, `devTools`, `crash`, `slow`, `preserveScroll`, and `viewTransition`. The `layer` option replaces `resources`. A parent's Layer requires the Layer of every Block its Model Schema can hold, so provide each child Block's `Live` Layer to its parent's Layer, and provide ordinary services beneath them. A missing Block or service is a type error at `Program.make`. The Runtime builds the Layer once per start, before the root instance's `init` runs, and releases it when the runtime stops. The Flags Effect runs outside the program's Layer, so provide the services it needs on the Effect itself. `Program.make` has no `freezeModel` option. Routing Messages whose payloads are `{ request }` and `{ url }` can be passed to `routing` as constructors. A root view that returns Html renders as the body of a Document titled with the root Block id.

The `Runtime` exports `makeApplication`, `makeElement`, `ApplicationConfig`, `ApplicationConfigWithFlags`, `RoutingApplicationConfig`, `RoutingApplicationConfigWithFlags`, `ElementConfig`, `ElementConfigWithFlags`, `ApplicationInit`, `RoutingApplicationInit`, `ElementInit`, and `MakeRuntimeReturn` are removed. Use `Program.ProgramOptions` and `Program.ElementOptions` to describe program options.

Server rendering takes the same class and Layer: `Server.renderToString(Application, { layer: ApplicationLive, Flags }, { flags, url })` from `foldkit/experimental`. The browser hydrates a `Program.make` program built from the same class.

`story` and `scene` run against a Block's Layer instead of `update` and `view`. They create an instance and start from the Model its `init` returns unless `given` sets one. Pass the instance's args after the Layer when the Block takes them: `story(layer, args, ...steps)`. The Layer must provide exactly one root Block, so provide its children with `Layer.provide`, not `Layer.merge`, and provide the services the Layers yield. Both return an Effect, so run them with `it.effect` from `@effect/vitest`:

```ts
// Before
test('choosing a theme saves it', () => {
  story(
    update,
    given({ theme: 'System' }),
    message(Message.ClickedTheme({ theme: 'Dark' })),
    Command.resolve(SaveTheme, Message.CompletedSaveTheme()),
  )
})

// After
it.effect('choosing a theme saves it', () =>
  story(
    SettingsLive.pipe(Layer.provide(SettingsStoreTest)),
    given({ theme: 'System' }),
    message(Settings.Message.ClickedTheme({ theme: 'Dark' })),
    Command.resolve(SaveTheme, Settings.Message.CompletedSaveTheme()),
  ),
)
```

In tests the Model is the resolved tree: each instance appears as its own Model, as in `model.settings.theme`, and `Resolved<Model>` from `foldkit/block` names that type. `given` sets the state of the instances the Model holds, and it may contain `new Child(id, args)` values to start from a tree with different instances. A story never runs Command handlers, but it builds the Block from its Layer, so it provides every service the Layers yield. When the Layer still requires a child Block, `story` and `scene` return `MissingBlockLayer<Child>` instead of an Effect, so the type error at `it.effect` names the Block whose Layer to provide. The root instance's `start` Commands are not part of a story. A child's `start` Commands are, as Commands of the update that put the child in the Model.

To test a parent's reaction to a child, address the child's Message with `Block.deliver(Child, path, message)` and pass it to `message` or `Scene.deliver`. A path is the instance ids from the root: a direct child is `Block.deliver(Settings, 'settings', message)`, a row in a collection is `Block.deliver(Row, 'row-3', message)`, and a grandchild is `Block.deliver(Row, ['table', 'row-3'], message)`. Field names are not part of the path. `Scene.deliver(message)` dispatches a Message whose cause is not a rendered interaction, such as a Subscription or a host event, and replaces `Scene.Subscription.emit`. A child's Command result is routed back to the child automatically. When sibling instances have identical pending Commands, `Command.at('left', SaveCount)` restricts a matcher to the instance at that path.

`init`'s second argument carries the instance's `id` and its `path` from the root, such as `['table', 'row-3']`. The root's path is empty. Store what the instance needs in its Model, for example to derive a DOM id that must be unique across the program.
