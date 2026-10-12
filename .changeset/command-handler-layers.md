---
'foldkit': minor
'@foldkit/ui': minor
---

Move the implementations of Commands, Subscriptions, Mounts, and ManagedResources into Effect Layers. The application now selects effect implementations and their service providers in one Layer graph before startup. Production and ordinary execution tests can use the same handlers while supplying different HTTP, storage, RPC, clock, browser, or other external services beneath them.

The original definition's `toLayer` can supply an alternative to an attached handler. A focused runtime orchestration test can use this seam to control execution, interruption, or cleanup. Such a test exercises the runtime around the handler without covering the replaced implementation.

A Command definition carries its named handler requirement through update and parent composition. Its Layer carries the implementation's service requirements. Adding an HTTP, storage, or telemetry dependency changes the handler Layer's requirements, which application assembly must satisfy, without changing update's handler requirement.

The Runtime builds the provided application Layer once for each start. A definition's `config.handler` is a generator constructor that runs during that build, captures service lookups once, and returns the handler used by the Runtime. Foldkit applies `Effect.gen` internally. The returned handler still runs afresh for every Command invocation, Subscription scope, Mount element, or ManagedResource acquisition. Commands, Subscriptions, and Mounts return a function that receives the current args, dependencies, or element. ManagedResources return an object with `acquire` and `release` functions that manage each Model-controlled handle.

Handlers and services may own mutable execution bookkeeping, such as worker availability or protocol request IDs. The Model and update own pending work shown to the user, selections, and submission rules. A `Ref` created in the constructor must not become the source of truth for workflow decisions or state read by view.

Commands, Mounts, Subscription entries, ManagedResource entries, and experimental Query definitions may omit `handler` when an external host owns the implementation. Those definitions have no `.layer`; the host supplies its implementation through `toLayer`, which accepts the implementation Effect constructor. An attached `.layer` uses the same construction path and definition identity as `toLayer(constructor)`. A ManagedResource constructor must return both `acquire` and `release` functions. This applies to `config.handler` and constructors supplied to `toLayer`.

## Migration

Each before/after pair shows the affected part of an existing module. Imports from `./message` and `./model` refer to the application's existing Message and Model Schemas. When several definitions belong to one Submodel or application module, compose their `.layer` recipes in that owner's `EffectsLayer`.

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
    // Capture the application's storage service when the Layer builds.
    const store = yield* KeyValueStore.KeyValueStore

    // Each invocation gets fresh contents and performs its own write.
    return ({ contents }) =>
      store.set(DRAFT_STORAGE_KEY, contents).pipe(
        Effect.as(Message.CompletedStoreDraft()),
        Effect.catch(() => Effect.succeed(Message.FailedStoreDraft())),
      )
  },
})

// Carry the handler recipe to application assembly.
export const EffectsLayer = StoreDraft.layer
```

update calls `StoreDraft({ contents })` as before. Its requirement is the `StoreDraft` handler; the storage service requirement belongs to `StoreDraft.layer` and must be supplied at assembly.

A constructor that has no service to look up still uses the same generator shape. It yields nothing and returns the invocation function directly:

```ts
import { Duration, Effect } from 'effect'
import { Command } from 'foldkit'

import { Message } from './message'

const DISMISSAL_DELAY = Duration.seconds(5)

export const WaitBeforeDismissal = Command.define('WaitBeforeDismissal', {
  messages: [Message.CompletedWaitBeforeDismissal],
  handler: function* () {
    // No services to obtain; each invocation starts its own delay.
    return () =>
      Effect.sleep(DISMISSAL_DELAY).pipe(
        Effect.as(Message.CompletedWaitBeforeDismissal()),
      )
  },
})

export const EffectsLayer = WaitBeforeDismissal.layer
```

The generator runs once while the application Layer is built. Each `WaitBeforeDismissal()` Command invokes the returned function and starts a new delay.

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
    // Handler name; gameClockTicks is this Stream's registration key.
    'GameClockTicks',
    { isRunning: Schema.Boolean },
    {
      // Every implementation must emit only these declared Messages.
      messages: [Message.TickedGameClock],
      modelToDependencies: model => ({ isRunning: model.isRunning }),
      handler: function* () {
        // Dependency changes restart the Stream, not this constructor.
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

The constructor builds once per application start. Changes to `isRunning` restart the Stream scope and call the returned function with fresh dependencies without reconstructing the handler. Keep `subscriptions` in the application configuration and provide its handler Layer.

The handler name `GameClockTicks` identifies the Layer requirement. The record key `gameClockTicks` identifies this runtime registration and its Stream scope. Several lifted registrations can share one definition and handler Layer while retaining separate registration keys and Stream scopes.

The `messages` collection constrains the attached handler and every external `toLayer` implementation to a Stream of the declared Message union. Scene also uses the declaration to verify that `Subscription.emit(entry, message)` selects the registered source and that the Message satisfies one of its Schemas before applying any parent Message mappings. Subscription lifecycle entries in DevTools are follow-up work.

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
  // No dependency Schema or Model projection is needed.
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

`HEARTBEAT_INTERVAL` is the application's existing interval.

Use `messages: []` when a Subscription owns scoped work but never emits a Message. The handler must then return `Stream<never>`. This example installs its own selection style while a drag is active and removes that style when the dependency changes or the application stops:

```ts
export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  dragSelectionStyles: entry(
    'DragSelectionStyles',
    { isDragging: Schema.Boolean },
    {
      // Silent scoped work has no result Messages.
      messages: [],
      modelToDependencies: model => ({ isDragging: model.isDragging }),
      handler: function* () {
        return ({ isDragging }) =>
          Stream.when(
            Stream.fromEffect(
              // This active Stream scope owns the style and its cleanup.
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

export const EffectsLayer = subscriptions.dragSelectionStyles.layer
```

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
    // Measure each mounted element, not during application construction.
    return ({ element }) =>
      Effect.sync(() =>
        Message.CompletedMeasurePanel({
          height: element.getBoundingClientRect().height,
        }),
      )
  },
})

// Register the view's allowed Mount; provide its implementation separately.
export const mounts = [MeasurePanel]
export const EffectsLayer = MeasurePanel.layer
```

Use `h.OnMount(MeasurePanel())` in the view as before. Add `mounts` to `Application.make({ mounts, ... })` and provide `EffectsLayer`. The Mount reads the rendered panel's actual `getBoundingClientRect().height` after that element enters the DOM and reports it as `CompletedMeasurePanel`. Registration gives the view builder its allowed Mount contracts and adds their handler requirements to the application. TypeScript rejects unregistered Mounts; Foldkit also checks the exact rendered definition before patching the DOM. A registered Mount that is absent from the rendered tree performs no element work.

`Mount.defineStream` uses the same `config.handler` generator, returning an element function that produces a Stream. Keep element acquisition and cleanup inside that returned handler so each element owns its own scope.

### Views that use Mounts

An inline application view gets its allowed Mounts from `Application.make({ mounts, ... })`. An exported view must preserve the Mount requirements in its builder signature. A plain view changes from `HtmlBuilder<Message>` to `HtmlBuilder<Message, Mount.RequirementsOf<typeof mounts>>`. For a branded Submodel view, annotate its Model and owner builder so `Submodel.defineView` infers the contracts:

**Before**

```ts
import { Submodel } from 'foldkit'

import { MeasurePanel } from './mount'
import type { Message } from './message'
import type { Model } from './model'

export const view = Submodel.defineView<Model, Message>((model, h) =>
  h.div([h.OnMount(MeasurePanel())], [model.label]),
)
```

**After**

```ts
import { Mount, Submodel } from 'foldkit'
import type { HtmlBuilder as FoldkitHtmlBuilder } from 'foldkit/html'

import { MeasurePanel } from './mount'
import type { Message } from './message'
import type { Model } from './model'

export const mounts = [MeasurePanel]

// Share this contract with helpers on the mounted view path.
export type HtmlBuilder = FoldkitHtmlBuilder<
  Message,
  Mount.RequirementsOf<typeof mounts>
>

// Infer the child Message and Mount contracts from the builder parameter.
export const view = Submodel.defineView((model: Model, h: HtmlBuilder) =>
  h.div([h.OnMount(MeasurePanel())], [model.label]),
)
```

A child with `ViewInputs` annotates them as its second parameter and receives the builder third. The explicit generic form remains supported, with `void` as the third type parameter when there are no inputs. The parent collects the child's `mounts` with its own and provides the child's `EffectsLayer`. TypeScript checks that the parent builder allows every Mount required by the child view before `h.submodel` can embed it. Views with no Mounts keep their existing signatures, and their `Html` result type is unchanged.

When several helpers share a mounted view path, export one `HtmlBuilder` type from the owning module, derived from its Message type and inferred `mounts` registry. Helpers then use `h: HtmlBuilder`, or `h: Chart.HtmlBuilder` through a module namespace import. Application assembly includes those exported registrations. This preserves the registration check without repeating the Mount contract in every helper signature; pure helpers keep the framework's `HtmlBuilder<Message>`.

Let TypeScript infer Mount registration arrays and composed spreads. An annotation such as `ReadonlyArray<Mount.LayeredMountDefinition>` erases the definition contracts and is rejected at application assembly. If forwarded attribute arrays need an explicit type, preserve the requirements as `Attribute<Message, RequiredMounts>` or `ChildAttribute<RequiredMounts>`. `childAttributes` and `CustomElement.withMessage(h)` preserve the requirements automatically.

### Typed CustomElement builders

The inferred result of `Widget.withMessage(h)` retains the view builder's allowed Mounts. A `CustomElement.Builder` annotation for a builder that accepts mounted attributes needs the same capability as its third type parameter. This pair assumes the existing module exports its `Widget` spec and `mounts` registrations.

**Before**

```ts
import type { CustomElement } from 'foldkit'

import type { Message } from './message'
import { Widget } from './widget'

export type WidgetBuilder = CustomElement.Builder<typeof Widget, Message>
```

**After**

```ts
import type { CustomElement, Mount } from 'foldkit'

import type { Message } from './message'
import { mounts } from './mount'
import { Widget } from './widget'

export type WidgetBuilder = CustomElement.Builder<
  typeof Widget,
  Message,
  // Mounted attributes retain the same contract as the view builder.
  Mount.RequirementsOf<typeof mounts>
>
```

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
        // Construct the handler now; acquire the camera when the Model requests it.
        return {
          acquire: ({ facingMode }) =>
            Effect.tryPromise(() =>
              navigator.mediaDevices.getUserMedia({ video: { facingMode } }),
            ),
          // Required cleanup runs when the active camera handle is released.
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

This example uses the storage service needed by `StoreDraft`. The owning module's `./layer` file exports its composed handler `EffectsLayer`.

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
// Storage satisfies the handler constructor's service requirement.
const AppLayer = Layer.provide(EffectsLayer, ServicesLayer)

// The application still requires its declared handlers until provided.
const application = Application.make({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
})

// Supply the complete Layer graph before starting the Runtime.
pipe(application, Application.provide(AppLayer), Runtime.run)
```

For an Element, replace `Runtime.makeElement(config)` with `pipe(Application.makeElement(config), Application.provide(AppLayer))` before passing the result to `Runtime.run` or `Runtime.embed`. Preserve existing Flags, routing, Ports, Subscriptions, ManagedResources, and DevTools configuration. Add each owning module's `mounts` registrations when its view renders Mounts.

### External host implementations

Omit `handler` only when the definition is an implementation contract for an external host. The definition has `toLayer` but no `.layer`; the host owns the constructor Effect and supplies its Layer at the application boundary.

```ts
import { Context, Effect } from 'effect'
import { Command } from 'foldkit'

import { Message } from './message'

type HostApi = Readonly<{
  requestToken: Effect.Effect<string>
}>

const HostApi = Context.Service<HostApi>('HostApi')

// A host contract omits handler, so this definition has no attached .layer.
export const RequestHostToken = Command.define('RequestHostToken', {
  messages: [Message.CompletedRequestHostToken],
})

// Build the host implementation from the original definition.
const RequestHostTokenLayer = RequestHostToken.toLayer(
  Effect.gen(function* () {
    const host = yield* HostApi

    return () =>
      host.requestToken.pipe(
        Effect.map(token => Message.CompletedRequestHostToken({ token })),
      )
  }),
)
```

The host composes `RequestHostTokenLayer` into `AppLayer`. The same contract applies to a Subscription, Mount, ManagedResource, or experimental Query definition without `handler`: `toLayer` receives the constructor Effect that returns that definition's complete implementation.

### Update requirements

Wrap update with `Update.define` and let the matcher infer its return instead of manually listing the services required by its Commands. For the `StoreDraft` Command above:

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

// Infer Command requirements from the returned Commands across all branches.
const update = Update.define((model: Model, message: Message) =>
  Message.match(message, {
    ClickedSaveDraft: () => ({
      model,
      commands: [StoreDraft({ contents: model.contents })],
    }),
    CompletedStoreDraft: () => ({ model }),
    FailedStoreDraft: () => ({ model }),
  }),
)

// This requires StoreDraft's handler, not its underlying storage service.
type CommandRequirements = Update.RequirementsOf<typeof update>
```

`CommandRequirements` is inferred from the update contract, including the `StoreDraft` handler requirement. It excludes lifecycle-only requirements such as Mounts registered separately with the application.

#### Standalone Steps

Use `Update.defineStep` for a standalone Step that returns Commands. With the same imports and definitions:

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
// Standalone Steps infer the same requirements without a manual annotation.
const storeDraft = Update.defineStep((model: Model) => ({
  model,
  commands: [StoreDraft({ contents: model.contents })],
}))
```

Annotate the callback's Model parameter, as in `(model: Model) => ...`, and let `Update.defineStep` infer the result Messages, handler requirements, and OutMessage from its return. The helper's type parameter represents the complete Step function, so `Update.defineStep<Model>` does not annotate its Model.

Bind an OutMessage fold directly to its union's matcher instead of wrapping a call that forwards the OutMessage. A pure fold can supply `Update.Step<Model, Message>` as the matcher output, which types its Model callbacks without `Update.defineStep`. For a generic child, pass the refined OutMessage type as the second matcher type argument.

A Command-producing fold can infer its requirements through `Update.defineStep`, or derive the matcher output from an existing Step producer's `ReturnType`. `Update.Step<Model, Message>` sets requirements to `never` and cannot represent Commands that require handler Layers. Retain collection keys, other context consumed by the matcher branches, and `FoldContext` lifters.

## Layer composition and lifetimes

### Composing Layers

Keep definitions and handlers within the feature whose update returns them, alongside update or in a feature-local `command.ts`. Use a `// EFFECTS LAYER` section for a combined handler bundle in a sectioned `main.ts`. Compose attached recipes directly as `Definition.layer` in each owning module's combined `EffectsLayer`, such as `Search.EffectsLayer`. When a recipe needs its own exported or reused binding, name it `FooLayer`; name an external alternative `FooTestLayer`. At the application root, combine root and Submodel implementations in `EffectsLayer`, external providers in `ServicesLayer`, and export `AppLayer` from `Layer.provide(EffectsLayer, ServicesLayer)`. Import Effect's module as `Layer`; the bundle names avoid an alias.

Foldkit UI components export their own `EffectsLayer` and, when needed, `mounts`. Compose those exports at the Submodel or application module that owns the component, then carry the resulting effect and registration bundles to the root. `Slider.forRoot(name, getTrackRoot)` and `Toast.make(name, payloadSchema)` return instance-owned Subscription and effect bundles; compose those exports where the instance is created.

### Requirements and definition identities

#### Inferred requirements

`Update.define` infers Command requirements and OutMessages across Message branches while preserving required, optional, and rest context parameters. `Update.RequirementsOf<typeof update>` reads the Command services from an update contract without including lifecycle-only services. `Application.make` and `Application.provide` carry all remaining handler and service requirements until the selected Layers satisfy them.

#### Registration names

Each handler name belongs to one registered Subscription, Mount, or ManagedResource definition within an application. `Application.make` rejects distinct registered definitions of those types with the same name. Multiple lifted Subscription registrations of the same definition can share its Layer. A ManagedResource retains its handler contract through lifting; each registered resource tag key still has one lifecycle owner.

#### Handler protocols

Handler requirements carry the name and protocol that share an Effect Context key: decoded args and declared result Messages for Commands, decoded dependencies and declared Messages for Subscriptions, element inputs and declared result Messages for Mounts, and decoded acquire params and resource values for ManagedResources. `Application.provide` rejects incompatible same-named contracts supplied directly, combined in a `Layer.mergeAll` bundle, introduced through the Layer's own requirements, or accumulated through sequential provision.

#### Definition identity checks

Distinct definitions with identical names and protocols remain structurally indistinguishable to TypeScript. Foldkit checks the private definition identity before invoking a Command handler, starting a Subscription, executing a Mount, or beginning a ManagedResource lifecycle, and rejects a Layer built from another definition. Build an external alternative with the original definition's `toLayer` so it retains that definition's identity.

#### ManagedResource ownership

Each registered ManagedResource tag key has one lifecycle owner. `Application.make` and `Application.makeElement` reject the same resource key under multiple registration keys, including separately created tags with matching keys. Give independent resource instances distinct tag keys so each accessor resolves its own handle.

### Startup and cleanup

`Runtime.run(program, { flags })` also has a data-last form, `Runtime.run({ flags })(program)`, so an entry can end its application pipeline with `Runtime.run({ flags })`. Both forms check the Flags value and its required services against the provided application. Flags-free applications can end with `Runtime.run`.

Application Layer construction happens before Flags, init, or the first render. A construction failure therefore stops startup before a Model exists for a crash view. `Runtime.hydrate` validates the server handoff before acquiring the application Layer.

ManagedResource release now waits for the explicit callback and scoped finalizers before clearing the handle or dispatching `onReleased`. Cleanup defects are contained so remaining finalizers and the lifecycle transition can complete.
