---
'foldkit': minor
---

Build applications from Blocks. A Block is a class that declares a feature's contract, plus a Layer that implements it. A parent holds child Block instances in its Model, and Foldkit routes each instance's Messages back to it. Blocks replace `Runtime.makeApplication`, `Runtime.makeElement`, Submodels, the `Subscription` module, and `ManagedResource`.

The architecture does not change. The Model is the source of truth, Messages record facts, update is pure, and the Runtime performs the Commands update returns. What moves is where each piece is written:

- Command, Mount, and Subscription implementations move out of their definitions and into the Block's constructor, where they close over the services it yields.
- `init` becomes the constructor's returned `model`, plus `start` Commands for the work `init` used to return.
- Child wiring becomes instances held in the parent Model. The parent sends a child Messages and handles its OutMessages. `Got*Message` wrappers, `toParentMessage`, and `Update.foldChild` go away.
- `Runtime.makeApplication(config)` becomes `Program.make(Application, { layer, ... })`, where the Layer provides the root Block, every Block it creates, and the application's services.

Declare a Block with `class X extends Block<X>()('X', { Model, Message, OutMessage?, Command?: [...], Mount?: [...] }) {}`. The class contains no implementation. Declare the Message union and the Block's Commands at module level before the class, so Commands can name their result Messages. Optional type parameters after the class declare the constructor args, the view input a parent passes, and the value the instance exposes: `Block<X, Args, ViewInput, Exposed>()`.

Implement it with `XLive = X.make(Effect.fn(function* (id, args) { ... }))`. The constructor runs once per instance, synchronously, when the instance enters its parent's Model. It yields services and returns `{ model, start?, update, commands?, mounts?, stream?, subscriptions?, expose?, view }`:

- `model` is the instance's starting Model.
- `start` lists Commands the Runtime performs when the instance appears. Load data here, never with asynchronous work in the constructor.
- `update` has one handler per Message: `(model, message) => ({ model, commands?, outMessage?, messages? })`. A handler that changes nothing returns `{ model }`.
- `commands` and `mounts` implement every Command and Mount listed on the class. A listed Command or Mount without a handler is a type error.
- `stream` is a Stream of Messages that runs for as long as the instance exists.
- `subscriptions` is a record of `{ dependencies, stream, keepAliveEquivalence? }` entries. Foldkit recomputes `dependencies` from the instance's Model after each update and restarts that entry's Stream when they change.
- `expose` is a value the parent's Commands read with `instance.use`.
- `view` renders the instance with `(model, h)`, or `(model, h, input)` when the Block declares a view input.

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

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    return {
      model: { count: 0 },
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
    }
  }),
)
```

`Command.define` no longer accepts `execute`. It declares the Command's name, `args`, result `messages`, and optional `interrupt`. A handler must convert expected failures into result Messages, and the services it uses come from the constructor. `Mount.define` and `Mount.defineStream` move the same way: remove `execute`, list the Mount under `Mount: [...]`, and implement it under `mounts`. The view attaches it with `h.OnMount(...)` as before, and attaching a Mount the class does not list is a type error. `Command.define` also accepts a `handler` generator for a Command that carries its own implementation, exposed as `.layer`, and every definition has `toLayer` for building an implementation Layer outside the definition.

A Submodel becomes a child Block. The parent's Model Schema names the child class itself, the parent constructor creates the instance with `yield* new Child('id', args)`, and the parent's Layer provides the child's Layer:

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

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const settings = yield* new Settings('settings')

    return {
      model: { settings, previewTheme: 'System' },
      update: {
        ClickedResetSettings: model => ({
          model,
          messages: [model.settings.send(Settings.Message.RequestedReset())],
        }),
        ...settings.on({
          ChangedTheme: (model, { theme }) => ({
            model: modifyFields(model, { previewTheme: () => theme }),
          }),
        }),
      },
      view: (model, h) => h.main([], [model.settings.view()]),
    }
  }),
).pipe(Layer.provide(SettingsLive))
```

A parent and child meet in three places:

- The parent changes a child only by returning `messages: [model.child.send(Child.Message.Requested...())]`. A helper that rewrote a child's Model from the parent becomes a `Requested*` or `InformedOf*` Message on the child. The parent may read `model.child.model`, but it never writes it.
- The parent reacts to a child's OutMessages by spreading `...child.on({ Variant: (model, outMessage, instance) => result })` into its update record. Name each variant the parent handles.
- The parent renders a child with `model.child.view()`. A child that renders through parent callbacks declares a view input and is rendered with `model.child.view(input)`. Functions in the input run as the parent, so the Messages they create are the parent's. `Submodel.defineView` and `h.submodel` are removed.

An instance is live while it is in its parent's Model. Putting it in the Model runs its constructor, starts its `stream` and `subscriptions`, and performs its `start` Commands. Removing it closes its scope: its Streams stop, its running Commands are interrupted, and anything its constructor acquired is released. Putting the same instance back constructs it fresh. Instances can live in plain objects, arrays, `Option`, and tagged structs, but not in `HashMap`, `HashSet`, or class instances.

A keyed collection, previously folded with `Update.foldChildAt`, becomes an array or Record of instances. Create one factory in the constructor with `const row = yield* Row.each('rows', args)`, then call `row(key)` or `row(key, args)` for each instance. The factory's `row.on({ ... })` handles OutMessages from every instance it creates, and its third argument is the instance that reported. Key each instance by an identifier that stays with it, never by array position. `Update.foldChild`, `Update.foldChildAt`, `Update.foldChildInit`, `Update.foldChildInits`, and `Update.foldChildStep`, with their `ChildFold*`, `Fold*`, and `FoldContext` types, are removed.

`Subscription.make`, `Subscription.aggregate`, `Subscription.lift`, `Subscription.persistentEntry`, `Subscription.animationFrameEntry`, and `Port.subscriptionEntry` are removed, along with the `foldkit/subscription` entry point. An event source that runs for as long as the Block exists is the constructor's `stream`. A source gated by Model state is a `subscriptions` entry, whose `dependencies` no longer need a Schema; return `Stream.empty` for dependencies that should produce no Messages. Each Block's entries start and stop with its instance, so there is nothing to aggregate. Read an inbound Port with `Port.stream(port)` and map it to Messages in a `stream` or `subscriptions` entry. Use `Dom.animationFrameTicks` for animation frames.

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

// After, in the constructor's result
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

`ManagedResource` and the `foldkit/managedResource` entry point are removed. A handle that should exist only while the Model needs it is a child Block. The child acquires the handle in its constructor with `Effect.acquireRelease` and exposes it with `expose`. The parent holds the instance in an `Option` field: `Option.some(socket)` acquires the handle and `Option.none()` releases it. Parent Commands read the exposed value with `instance.use`, which fails with `NotConnected` while the instance is not in the Model. The `onAcquired`, `onReleased`, and `onAcquireError` Messages become ordinary facts: the parent knows when it adds or removes the instance, and a failure the child observes becomes a child Message or OutMessage.

```ts
export class Socket extends Block<Socket, { url: string }, void, SocketHandle>()(
  'Socket',
  {
    Message: defineMessageUnion({ Received: { data: Schema.String } }),
    OutMessage: defineMessageUnion({ Received: { data: Schema.String } }),
  },
) {}

export const SocketLive = Socket.make(
  Effect.fn(function* (_id, { url }) {
    const socket = yield* Effect.acquireRelease(
      Effect.sync(() => new WebSocket(url)),
      socket => Effect.sync(() => socket.close()),
    )

    return {
      stream: Stream.fromEventListener<MessageEvent>(socket, 'message').pipe(
        Stream.map(event => Socket.Message.Received({ data: String(event.data) })),
      ),
      update: {
        Received: (model, { data }) => ({
          model,
          outMessage: Socket.OutMessage.Received({ data }),
        }),
      },
      expose: { send: data => Effect.sync(() => socket.send(data)) },
    }
  }),
)

// In the parent's Command handler
SendChat: ({ text }) =>
  socket.use.pipe(
    Effect.flatMap(({ send }) => send(text)),
    Effect.as(Message.SucceededSendChat()),
    Effect.catchTag('NotConnected', () => Effect.succeed(Message.FailedSendChat())),
  ),
```

The root is an ordinary Block named `Application`. Its constructor args declare what the host supplies: `{ flags }` when the Program declares `Flags`, `{ url }` with the starting URL when the Program has `routing`, or both. `Program.make` requires `Flags` for a root that takes `{ flags }` and `routing` for a root that takes `{ url }`. Pass the Flags Effect to `Runtime.run` as before:

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

`Program.make` creates a page-owning program and `Program.makeElement` a container-scoped one; pass either to `Runtime.run`, `Runtime.hydrate`, or `Runtime.embed`. Both also live at `foldkit/program`. Program options keep `container`, `Flags`, `routing`, `ports`, `devTools`, `crash`, `slow`, `preserveScroll`, and `viewTransition`. The `layer` option replaces `resources`: provide each child Block's `Live` Layer to the Layer of every parent that creates it, and provide ordinary services beneath them. A missing Block or service is a type error at `Program.make`. The Runtime builds the Layer once per start, before the root is constructed, and releases it when the runtime stops. The Flags Effect runs outside the program's Layer, so provide the services it needs on the Effect itself. `Program.make` has no `freezeModel` option. Routing Messages whose payloads are `{ request }` and `{ url }` can be passed to `routing` as constructors. A root view that returns Html renders as the body of a Document titled with the root Block id.

The `Runtime` exports `makeApplication`, `makeElement`, `ApplicationConfig`, `ApplicationConfigWithFlags`, `RoutingApplicationConfig`, `RoutingApplicationConfigWithFlags`, `ElementConfig`, `ElementConfigWithFlags`, `ApplicationInit`, `RoutingApplicationInit`, `ElementInit`, and `MakeRuntimeReturn` are removed. Use `Program.ProgramOptions` and `Program.ElementOptions` to describe program options.

Server rendering takes the same class and Layer: `Server.renderToString(Application, { layer: ApplicationLive, Flags }, { flags, url })` from `foldkit/experimental`. The browser hydrates a `Program.make` program built from the same class.

`story` and `scene` run against a Block's Layer instead of `update` and `view`. They build the instance from the Layer and start from the Model its constructor returns unless `given` sets one. Pass constructor args after the Layer when the Block takes them: `story(layer, args, ...steps)`. The Layer must provide exactly one root Block, so provide its children with `Layer.provide`, not `Layer.merge`, and provide the services its constructors yield. Both return an Effect, so run them with `it.effect` from `@effect/vitest`:

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

In tests the Model is the resolved tree: each instance appears as its own Model, as in `model.settings.theme`, and `Resolved<Model>` from `foldkit/block` names that type. `given` can set child state but cannot add or remove instances. A story never runs Command handlers, and the root instance's `start` Commands are not part of it. A child's `start` Commands are, as Commands of the update that put the child in the Model.

To test a parent's reaction to a child, address the child's Message with `Block.deliver(Child, 'id', message)`, or `Block.deliver(Child, ['rows', 'row-3'], message)` for an instance created by `each`, and pass it to `message` or `Scene.deliver`. `Scene.deliver(message)` dispatches a Message whose cause is not a rendered interaction, such as a Stream, a Subscription, or a host event, and replaces `Scene.Subscription.emit`. A child's Command result is routed back to the child automatically. When sibling instances have identical pending Commands, `Command.at('left', SaveCount)` restricts a matcher to the instance at that path.
