---
'foldkit': minor
'@foldkit/ui': minor
---

Move the implementations of Commands, Subscriptions, Mounts, and ManagedResources into Effect Layers. The application now selects effect implementations and their service providers in one Layer graph before startup. Production and ordinary execution tests can use the same handlers while supplying different HTTP, storage, RPC, clock, browser, or other external services beneath them.

A Command definition carries its named handler requirement through update and parent composition. Its Layer carries the implementation's service requirements. Adding an HTTP, storage, or telemetry dependency changes the handler Layer's requirements, which application assembly must satisfy, without changing update's handler requirement.

The Runtime builds the provided application Layer once for each start. A definition's `config.handler` is a generator constructor that builds its handler during that build, and the definition exposes the attached recipe as `.layer`. Foldkit applies `Effect.gen` internally. Commands, Subscriptions, and Mounts return a function that performs work with the current args, dependencies, or element. ManagedResources return an object with `acquire` and `release` functions that manage each Model-controlled handle. Return the handler directly when construction has no work to perform.

Commands, Mounts, Subscription entries, ManagedResource entries, and experimental Query definitions may omit `handler` when an external host owns the implementation. Those definitions have no `.layer`; the host supplies its implementation through `toLayer`, which accepts the implementation Effect constructor. An attached `.layer` uses the same construction path and definition identity as `toLayer(constructor)`. A ManagedResource handler must supply both `acquire` and `release`, whether attached to the entry or passed to `toLayer`.

## Migration

Each pair shows the affected part of an existing module. Imports from `./message` and `./model` refer to the application's existing Message and Model Schemas. Compose the individual `.layer` recipes shown below in one feature `EffectsLayer` when these definitions share a feature.

### Commands

Remove `execute` from `Command.define`. Set `config.handler` to the handler generator. Obtain shared services in the generator, and use them inside the returned invocation function.

**Before**

```ts
import { Effect, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Command } from 'foldkit'

import { Message } from './message'

const DRAFT_STORAGE_KEY = 'draft'

export const StoreDraft = Command.define('StoreDraft', {
  args: { contents: Schema.String },
  messages: [Message.CompletedStoreDraft, Message.FailedStoreDraft],
  execute: ({ contents }) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore

      yield* store.set(DRAFT_STORAGE_KEY, contents)
      return Message.CompletedStoreDraft()
    }).pipe(Effect.catch(() => Effect.succeed(Message.FailedStoreDraft()))),
})
```

**After**

```ts
import { Effect, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Command } from 'foldkit'

import { Message } from './message'

const DRAFT_STORAGE_KEY = 'draft'

export const StoreDraft = Command.define('StoreDraft', {
  args: { contents: Schema.String },
  messages: [Message.CompletedStoreDraft, Message.FailedStoreDraft],
  handler: function* () {
    const store = yield* KeyValueStore.KeyValueStore

    return ({ contents }) =>
      store.set(DRAFT_STORAGE_KEY, contents).pipe(
        Effect.as(Message.CompletedStoreDraft()),
        Effect.catch(() => Effect.succeed(Message.FailedStoreDraft())),
      )
  },
})

export const EffectsLayer = StoreDraft.layer
```

update calls `StoreDraft({ contents })` as before. Its requirement is the `StoreDraft` handler; the storage service requirement belongs to `StoreDraft.layer` and must be supplied at assembly. Return the handler directly from `function* () { return handler }` when construction needs no services or preparation.

### Subscriptions

Give every entry a stable handler name, a `messages` declaration, and a `handler` generator. Keep `modelToDependencies` on entries with Model dependencies. Move `dependenciesToStream` into the handler generator.

This timer follows the Model's `isRunning` field.

**Before**

```ts
import { Duration, Effect, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { Message } from './message'
import type { Model } from './model'

const TICK_INTERVAL = Duration.seconds(1)

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  gameClockTicks: entry(
    { isRunning: Schema.Boolean },
    {
      modelToDependencies: model => ({ isRunning: model.isRunning }),
      dependenciesToStream: ({ isRunning }) =>
        Stream.when(
          Stream.tick(TICK_INTERVAL).pipe(
            Stream.drop(1),
            Stream.map(Message.TickedGameClock),
          ),
          Effect.sync(() => isRunning),
        ),
    },
  ),
}))
```

**After**

```ts
import { Duration, Effect, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { Message } from './message'
import type { Model } from './model'

const TICK_INTERVAL = Duration.seconds(1)

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  gameClockTicks: entry(
    'GameClockTicks',
    { isRunning: Schema.Boolean },
    {
      messages: [Message.TickedGameClock],
      modelToDependencies: model => ({ isRunning: model.isRunning }),
      handler: function* () {
        return ({ isRunning }) =>
          Stream.when(
            Stream.tick(TICK_INTERVAL).pipe(
              Stream.drop(1),
              Stream.map(Message.TickedGameClock),
            ),
            Effect.sync(() => isRunning),
          )
      },
    },
  ),
}))

export const EffectsLayer = subscriptions.gameClockTicks.layer
```

The constructor builds once per application start. Changes to `isRunning` restart the Stream scope without reconstructing the handler. Keep `subscriptions` in the application configuration and provide its handler Layer.

#### Subscriptions without Model dependencies

Replace `Subscription.persistentEntry` with a named entry. Omit the dependency fields and `modelToDependencies`; declare the Messages and return a zero-argument Stream function.

**Before**

```ts
export const subscriptions = Subscription.make<Model, Message>()(_entry => ({
  heartbeatTicks: Subscription.persistentEntry(
    Stream.tick(HEARTBEAT_INTERVAL).pipe(
      Stream.drop(1),
      Stream.map(Message.TickedHeartbeat),
    ),
  ),
}))
```

**After**

```ts
export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  heartbeatTicks: entry('HeartbeatTicks', {
    messages: [Message.TickedHeartbeat],
    handler: function* () {
      return () =>
        Stream.tick(HEARTBEAT_INTERVAL).pipe(
          Stream.drop(1),
          Stream.map(Message.TickedHeartbeat),
        )
    },
  }),
}))

export const EffectsLayer = subscriptions.heartbeatTicks.layer
```

`HEARTBEAT_INTERVAL` is the application's existing interval. Use `messages: []` for scoped work that emits no Messages.

### Mounts

Remove `execute` from `Mount.define` and `Mount.defineStream`. Set `config.handler` to the element handler generator. The following measurement still happens when the element mounts.

**Before**

```ts
import { Effect } from 'effect'
import { Mount } from 'foldkit'

import { Message } from './message'

export const MeasurePanel = Mount.define('MeasurePanel', {
  messages: [Message.CompletedMeasurePanel],
  execute: ({ element }) =>
    Effect.sync(() =>
      Message.CompletedMeasurePanel({
        height: element.getBoundingClientRect().height,
      }),
    ),
})
```

**After**

```ts
import { Effect } from 'effect'
import { Mount } from 'foldkit'

import { Message } from './message'

export const MeasurePanel = Mount.define('MeasurePanel', {
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

Use `h.OnMount(MeasurePanel())` in the view as before. Add `mounts` to `Application.make({ mounts, ... })` and provide `EffectsLayer`. Registration is required because view and `Html` do not carry Effect requirements. A registered Mount that is absent from the rendered tree performs no element work.

`Mount.defineStream` uses the same `config.handler` generator, returning an element function that produces a Stream. Keep element acquisition and cleanup inside that returned handler so each element owns its own scope.

### ManagedResources

Give every entry a stable handler name. Put a generator in `config.handler` that returns `acquire` and `release`; keep Model requirements and lifecycle Messages in the config.

This camera entry assumes `model.maybeCamera` has the Schema `Schema.Option(Schema.Struct({ facingMode: Schema.String }))`.

**Before**

```ts
import { Effect, Schema } from 'effect'
import { ManagedResource } from 'foldkit'

import { Message } from './message'
import type { Model } from './model'

const CameraStream = ManagedResource.tag<MediaStream>()('CameraStream')
const CameraRequirements = Schema.Option(
  Schema.Struct({ facingMode: Schema.String }),
)

export const managedResources = ManagedResource.make<Model, Message>()(
  entry => ({
    camera: entry(CameraRequirements, {
      resource: CameraStream,
      modelToMaybeRequirements: model => model.maybeCamera,
      acquire: ({ facingMode }) =>
        Effect.tryPromise(() =>
          navigator.mediaDevices.getUserMedia({ video: { facingMode } }),
        ),
      release: stream =>
        Effect.sync(() => stream.getTracks().forEach(track => track.stop())),
      onAcquired: () => Message.AcquiredCamera(),
      onReleased: () => Message.ReleasedCamera(),
      onAcquireError: error =>
        Message.FailedAcquireCamera({ reason: String(error) }),
    }),
  }),
)
```

**After**

```ts
import { Effect, Schema } from 'effect'
import { ManagedResource } from 'foldkit'

import { Message } from './message'
import type { Model } from './model'

const CameraStream = ManagedResource.tag<MediaStream>()('CameraStream')
const CameraRequirements = Schema.Option(
  Schema.Struct({ facingMode: Schema.String }),
)

export const managedResources = ManagedResource.make<Model, Message>()(
  entry => ({
    camera: entry('ManageCamera', CameraRequirements, {
      resource: CameraStream,
      modelToMaybeRequirements: model => model.maybeCamera,
      onAcquired: () => Message.AcquiredCamera(),
      onReleased: () => Message.ReleasedCamera(),
      onAcquireError: error =>
        Message.FailedAcquireCamera({ reason: String(error) }),
      handler: function* () {
        return {
          acquire: ({ facingMode }) =>
            Effect.tryPromise(() =>
              navigator.mediaDevices.getUserMedia({ video: { facingMode } }),
            ),
          release: stream =>
            Effect.sync(() =>
              stream.getTracks().forEach(track => track.stop()),
            ),
        }
      },
    }),
  }),
)

export const EffectsLayer = managedResources.camera.layer
```

Keep `managedResources` in the application configuration and provide its handler Layer. Both `acquire` and `release` are required whenever a constructor is supplied. A no-op `release` is appropriate only when scoped acquisition, such as `Layer.build` or `Effect.acquireRelease`, already registered the real cleanup. The handler lives for the application start; camera acquisition and release follow `model.maybeCamera`.

### Application assembly and runtime resources

Remove the `resources` field. Define the program with `Application.make`, supply the composed `AppLayer` with `Application.provide`, then call `Runtime.run` or `Runtime.hydrate`.

This example uses the storage service needed by `StoreDraft`. The feature's `./layer` module exports its composed handler `EffectsLayer`.

**Before**

```ts
import { Runtime } from 'foldkit'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import { Model, init, update, view } from './main'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  resources: BrowserKeyValueStore.layerLocalStorage,
  container: document.getElementById('root'),
})

Runtime.run(application)
```

**After**

```ts
import { Layer, pipe } from 'effect'
import { Application, Runtime } from 'foldkit'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import { EffectsLayer } from './layer'
import { Model, init, update, view } from './main'

const ServicesLayer = BrowserKeyValueStore.layerLocalStorage
const AppLayer = Layer.provide(EffectsLayer, ServicesLayer)

const application = Application.make({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
})

Runtime.run(pipe(application, Application.provide(AppLayer)))
```

For an Element, replace `Runtime.makeElement(config)` with `pipe(Application.makeElement(config), Application.provide(AppLayer))` before passing the result to `Runtime.run` or `Runtime.embed`. Preserve existing Flags, routing, Ports, Subscriptions, ManagedResources, and DevTools configuration. Add each feature's `mounts` registrations when its view renders Mounts.

### Update requirements

Wrap update with `Update.make` and let the matcher infer its return instead of manually listing the services required by its Commands. For the `StoreDraft` Command above:

**Before**

```ts
import { KeyValueStore } from 'effect/persistence'
import { Update } from 'foldkit'

import { StoreDraft } from './command'
import { Message } from './message'
import type { Model } from './model'

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message, KeyValueStore.KeyValueStore>>(
    message,
    {
      ClickedSaveDraft: () => ({
        model,
        commands: [StoreDraft({ contents: model.contents })],
      }),
      CompletedStoreDraft: () => ({ model }),
      FailedStoreDraft: () => ({ model }),
    },
  )
```

**After**

```ts
import { Update } from 'foldkit'

import { StoreDraft } from './command'
import { Message } from './message'
import type { Model } from './model'

const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    ClickedSaveDraft: () => ({
      model,
      commands: [StoreDraft({ contents: model.contents })],
    }),
    CompletedStoreDraft: () => ({ model }),
    FailedStoreDraft: () => ({ model }),
  }),
)

type CommandRequirements = Update.RequirementsOf<typeof update>
```

`CommandRequirements` is inferred from the update contract, including the `StoreDraft` handler requirement. It excludes lifecycle-only requirements such as Mounts registered separately with the application.

Use `Update.makeStep` for a standalone Step that returns Commands. With the same imports and definitions:

**Before**

```ts
const storeDraft: Update.Step<
  Model,
  Message,
  KeyValueStore.KeyValueStore
> = model => ({
  model,
  commands: [StoreDraft({ contents: model.contents })],
})
```

**After**

```ts
const storeDraft = Update.makeStep((model: Model) => ({
  model,
  commands: [StoreDraft({ contents: model.contents })],
}))
```

## Layer composition and lifetimes

Compose attached recipes directly as `Definition.layer` in each feature's combined `EffectsLayer`, such as `Search.EffectsLayer`. When a recipe needs its own exported or reused binding, name it `FooLayer`; name an external alternative `FooTestLayer`. At the application root, combine feature implementations in `EffectsLayer`, external providers in `ServicesLayer`, and export `AppLayer` from `Layer.provide(EffectsLayer, ServicesLayer)`. Import Effect's module as `Layer`; the bundle names avoid an alias.

Foldkit UI exports `UI.EffectsLayer` and `UI.mounts` for the default component set. Selective applications can compose each component's `EffectsLayer` and `mounts`. `Slider.forRoot(name, getTrackRoot)` and `Toast.make(name, payloadSchema)` return instance-owned Subscription and effect bundles; compose those exports where the instance is created.

`Update.make` infers Command requirements and OutMessages across Message branches while preserving required, optional, and rest context parameters. `Update.RequirementsOf<typeof update>` reads the Command services from an update contract without including lifecycle-only services. `Application.make` and `Application.provide` carry all remaining handler and service requirements until the selected Layers satisfy them.

Each handler name belongs to one definition within an application. `Application.make` rejects distinct registered Subscription, Mount, or ManagedResource definitions with the same name. A Command reports a mismatched Layer when it runs because Commands are created by update rather than registered with the application. Multiple lifted uses of the same definition can share its Layer.

Each registered ManagedResource tag key has one lifecycle owner. `Application.make` and `Application.makeElement` reject the same resource key under multiple registration keys, including separately created tags with matching keys. Give independent resource instances distinct tag keys so each accessor resolves its own handle.

Application Layer construction happens before Flags, init, or the first render. A construction failure therefore stops startup before a Model exists for a crash view. `Runtime.hydrate` validates the server handoff before acquiring the application Layer.

ManagedResource release now waits for the explicit callback and scoped finalizers before clearing the handle or dispatching `onReleased`. Cleanup defects are contained so remaining finalizers and the lifecycle transition can complete.
