---
'foldkit': minor
'@foldkit/ui': minor
---

Move the implementations of Commands, Subscriptions, Mounts, and ManagedResources into Effect Layers. The application now selects effect implementations and their service providers in one Layer graph before startup. Production and ordinary execution tests can use the same handlers while supplying different HTTP, storage, RPC, clock, browser, or other external services beneath them.

The original definition's `toLayer` can supply an alternative to an attached handler. A focused runtime orchestration test can use this seam to control execution, interruption, or cleanup. Such a test exercises the runtime around the handler without covering the replaced implementation.

A Command definition carries its named handler requirement through update and parent composition. Its Layer carries the implementation's service requirements. Adding an HTTP, storage, or telemetry dependency changes the handler Layer's requirements, which application assembly must satisfy, without changing update's handler requirement.

The Runtime builds the provided application Layer once for each start. A definition's `config.handler` is a generator constructor that runs during that build, captures service lookups once, and returns the handler used by the Runtime. Foldkit applies `Effect.gen` internally. The returned handler still runs afresh for every Command invocation, Subscription scope, Mount element, or ManagedResource acquisition. Commands, Subscriptions, and Mounts return a function that receives the current args, dependencies, or element. ManagedResources return an object with `acquire` and `release` functions that manage each Model-controlled handle.

Handlers and services may own mutable execution bookkeeping, such as worker availability or protocol request IDs. The Model and update own pending work shown to the user, selections, and submission rules. A `Ref` created in the constructor must not become the source of truth for workflow decisions or state read by view.

Commands, Mounts, Subscription entries, and ManagedResource entries may omit `handler` when an external host owns the implementation. Those definitions have no `.layer`; the host supplies its implementation through `toLayer`, which accepts the implementation Effect constructor. An attached `.layer` uses the same construction path and definition identity as `toLayer(constructor)`. A ManagedResource constructor must return both `acquire` and `release` functions. This applies to `config.handler` and constructors supplied to `toLayer`.

## Migration

Each before/after pair shows the affected part of an existing module. Imports from `./message` and `./model` refer to the application's existing Message and Model Schemas. When several definitions belong to one Block or application module, compose their `.layer` recipes in that owner's local `EffectsLayer`.

Completed Blocks collect child Bindings automatically. Pass only local handler recipes to `FeatureComposition.prepareBlock({ EffectsLayer })`, include Bindings through `FeatureDefinition.makeComposition({ bindings })`, and export the completed `FeatureBlock`. Define locally owned Commands through `FeatureDefinition.makeCommand` so the composition path qualifies their protocol names.

### Commands

Remove `execute` from the Command definition. Set `config.handler` to the handler generator. Obtain shared services in the generator, and use them inside the returned invocation function.

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

import { DraftEditorDefinition } from './definition'
import { Message } from './message'

const DRAFT_STORAGE_KEY = 'draft'

export const StoreDraft = DraftEditorDefinition.makeCommand('StoreDraft', {
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

A constructor that has no service to look up still uses the same generator shape. It yields nothing and returns the invocation function directly. Do not add a fake `yield`; the recommended Foldkit Oxlint preset disables `require-yield` for this canonical constructor shape:

```ts
import { Duration, Effect } from 'effect'

import { Message } from './message'
import { NotificationsDefinition } from './definition'

const DISMISSAL_DELAY = Duration.seconds(5)

export const WaitBeforeDismissal = NotificationsDefinition.makeCommand(
  'WaitBeforeDismissal',
  {
    messages: [Message.CompletedWaitBeforeDismissal],
    handler: function* () {
      // No services to obtain; each invocation starts its own delay.
      return () =>
        Effect.sleep(DISMISSAL_DELAY).pipe(
          Effect.as(Message.CompletedWaitBeforeDismissal()),
        )
    },
  },
)

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

import { FeatureDefinition } from './definition'
import { Message } from './message'

const TICK_INTERVAL = Duration.seconds(1)

export const subscriptions = FeatureDefinition.makeSubscriptions(entry => ({
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

The constructor builds once per application start. Changes to `isRunning` restart the Stream scope and call the returned function with fresh dependencies without reconstructing the handler. Pass `subscriptions` and its local `EffectsLayer` to `FeatureComposition.prepareBlock`; parent Bindings carry both to the root.

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
export const subscriptions = FeatureDefinition.makeSubscriptions(entry => ({
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
export const subscriptions = FeatureDefinition.makeSubscriptions(entry => ({
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

Remove `execute` from the Mount definition. Set `config.handler` to the element handler generator. The following measurement still happens when the element mounts.

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

import { Message } from './message'
import { PanelDefinition } from './definition'

export const MeasurePanel = PanelDefinition.makeMount('MeasurePanel', {
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

Use `h.OnMount(MeasurePanel())` in the view as before. Include `MeasurePanel` in the owning `FeatureDefinition.makeComposition({ mounts })` and include `MeasurePanel.layer` in the local `EffectsLayer` passed to `FeatureComposition.prepareBlock`. The Mount reads the rendered panel's actual `getBoundingClientRect().height` after that element enters the DOM and reports it as `CompletedMeasurePanel`. TypeScript rejects unregistered Mounts; Foldkit also checks the exact rendered definition before patching the DOM. A registered Mount that is absent from the rendered tree performs no element work.

`FeatureDefinition.makeMountStream` uses the same `config.handler` generator, returning an element function that produces a Stream. Keep element acquisition and cleanup inside that returned handler so each element owns its own scope.

### Views that use Mounts

Author each primary Block or Application view through its owning Composition. Register local Mounts in that Composition's `mounts`; its `makeView` method supplies the checked builder without repeated requirement types.

**Before**

```ts
import type { HtmlBuilder } from 'foldkit/html'

import { MeasurePanel } from './mount'
import type { Message } from './message'
import type { Model } from './model'

export const view = (model: Model, h: HtmlBuilder<Message>) =>
  h.div([h.OnMount(MeasurePanel())], [model.label])
```

**After**

```ts
import { Block } from 'foldkit'

import { MeasurePanel } from './mount'
import { Message } from './message'
import { Model } from './model'
export const PanelDefinition = Block.makeDefinition('Panel', { Model, Message })
export const PanelComposition = PanelDefinition.makeComposition({
  mounts: [MeasurePanel],
})

export const view = PanelComposition.makeView((model, h) =>
  h.div([h.OnMount(MeasurePanel())], [model.label]),
)
```

A child with `ViewInputs` uses its Composition's `makeView.withInputs<ViewInputs>` and receives the builder third. A parent Binding carries the child's Mounts and handler recipe automatically. TypeScript checks that the parent Composition includes the Binding before `h.block(binding.embedView(...))` can embed it.

The Composition's `makeView` or `makeView.withInputs` defines its canonical owned view and infers the primary `h` parameter. Ordinary feature-local helpers are plain functions whose `h` parameter uses an owner-specific alias such as `FeatureViewBuilder`, derived with `Block.ViewBuilderFor<typeof FeatureComposition>`. Declare that alias immediately after its Composition with no blank line and export it only for cross-file use. The alias retains the feature Message, child, and Mount requirements without constructing a runtime builder. Its owner prefix identifies one Composition's capabilities at a plain type import site. Routine application annotations query local Schema values directly, such as `typeof Model.Type`; a child consumer queries `typeof ChildBlock.Model.Type`. Give each helper only the Model, domain, or context parameters it uses. Functions genuinely shared across owners keep the general `HtmlBuilder<Message>`.

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

import { Message } from './message'
import { mounts } from './mount'
import { Widget } from './widget'

export type WidgetBuilder = CustomElement.Builder<
  typeof Widget,
  typeof Message.Type,
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

import { CameraDefinition } from './definition'
import { Message } from './message'

const CameraStream =
  CameraDefinition.makeResource<MediaStream>()('CameraStream')
const CameraRequirements = Schema.Option(
  Schema.Struct({ facingMode: Schema.String }),
)

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

Create a Block-owned resource identity once with `CameraDefinition.makeResource`, then import that same `CameraStream` binding wherever a Command reads it or a ManagedResource entry registers it. Give separately managed resources distinct local names because assembly treats each qualified resource key as one lifecycle identity. Pass `managedResources` and its local `EffectsLayer` to `CameraComposition.prepareBlock`; parent Bindings carry both to the root. Both `acquire` and `release` are required whenever a constructor is supplied. A no-op `release` is appropriate only when scoped acquisition, such as `Layer.build` or `Effect.acquireRelease`, already registered the real cleanup. The handler lives for the application start; camera acquisition and release follow `model.maybeCamera`.

### Application assembly and runtime resources

Remove the `resources` field. The split root shown below keeps `ApplicationDefinition` in `definition.ts`, `ApplicationComposition` in `composition.ts`, completed assembly in `block.ts`, ordinary Service providers in `services.ts`, and browser startup in `entry.ts`. A compact root can keep every stage and implementation together in `application.ts`. Supply ordinary Services through the Program's `provide` method before calling the Runtime.

This example uses the storage service needed by `StoreDraft`. The Application collects its local handler recipes and the recipes of child Bindings included in its Composition; `ApplicationLayer` supplies their ordinary Services.

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

In `definition.ts`:

```ts
import { Block } from 'foldkit'

import { Model } from './model'
import { Message } from './message'

export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
```

In `composition.ts`:

```ts
import { ApplicationDefinition } from './definition'

export const ApplicationComposition = ApplicationDefinition.makeComposition()
```

In `block.ts`:

```ts
import { Block } from 'foldkit'

import { EffectsLayer } from './command'
import { ApplicationComposition } from './composition'
import { init } from './init'
import { Model } from './model'
import { update } from './update'
import { view } from './view'

const prepare = () =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    view,
    EffectsLayer,
  })
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
```

In `services.ts`:

```ts
import { BrowserKeyValueStore } from '@effect/platform-browser'

export const ApplicationLayer = BrowserKeyValueStore.layerLocalStorage
```

In `entry.ts`:

```ts
import { Program, Runtime } from 'foldkit'

import { ApplicationBlock } from './block'
import { ApplicationLayer } from './services'

const program = Program.make({
  block: ApplicationBlock,
  container: document.getElementById('root'),
})

Runtime.run(program.provide(ApplicationLayer))
```

For an Element, pass the completed `ApplicationBlock` to `Program.makeElement`, call `program.provide(ApplicationLayer)`, and pass the result to `Runtime.run` or `Runtime.embed`. Preserve existing Flags, Ports, container, and DevTools host configuration on the Program. Include local Subscriptions and ManagedResources in Block assembly; child Bindings included in the Composition contribute their lifecycle declarations and handlers automatically.

### External host implementations

Omit `handler` only when the definition is an implementation contract for an external host. The definition has `toLayer` but no `.layer`; the host owns the constructor Effect and supplies its Layer at the application boundary.

```ts
import { Context, Effect } from 'effect'
import { Message } from './message'
import { HostBridgeDefinition } from './definition'

type HostApi = Readonly<{
  requestToken: Effect.Effect<string>
}>

const HostApi = Context.Service<HostApi>('HostApi')

// A host contract omits handler, so this definition has no attached .layer.
export const RequestHostToken = HostBridgeDefinition.makeCommand(
  'RequestHostToken',
  {
    messages: [Message.CompletedRequestHostToken],
  },
)

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

List `RequestHostToken` in the feature completion's `hostHandlers`, then let the host call `block.provideHandlers(RequestHostTokenLayer)` before binding or installing that feature. `ApplicationLayer` remains the provider for ordinary Services such as `HostApi`. The same contract applies to a Subscription, Mount, ManagedResource, or experimental Query definition without `handler`: `toLayer` receives the constructor Effect that returns that definition's complete implementation.

### Update requirements

Author update through the typed Block or Application's `update` method and let the matcher infer its return instead of manually listing the services required by its Commands. For the `StoreDraft` Command above:

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
import { DraftEditorComposition } from './composition'
import { DraftEditorDefinition } from './definition'

// Infer Command requirements from the returned Commands across all handlers.
const update = DraftEditorComposition.makeUpdate({
  ClickedSaveDraft: DraftEditorDefinition.makeCommandsStep(model => [
    StoreDraft({ contents: model.contents }),
  ]),
  CompletedStoreDraft: DraftEditorDefinition.makeNoopStep(),
  FailedStoreDraft: DraftEditorDefinition.makeNoopStep(),
})

// This requires StoreDraft's handler, not its underlying storage service.
type CommandRequirements = Update.RequirementsOf<typeof update>
```

`CommandRequirements` is inferred from the update contract, including the `StoreDraft` handler requirement. It excludes lifecycle-only requirements such as Mounts registered separately with the application.

#### Named Steps

Use the owning Block or Application's `makeStep` method for a named Step that returns Commands. With the same imports and `DraftEditorDefinition`:

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
// The owner supplies Model typing; the result supplies Command requirements.
const storeDraft = DraftEditorDefinition.makeStep(model => ({
  model,
  commands: [StoreDraft({ contents: model.contents })],
}))
```

The owning definition supplies the callback's Model type. Its `makeStep` method infers the handler requirements and OutMessage from the return. Keep annotations for additional operation or dispatch-context parameters; omit repeated Model and Message annotations.

Bind an OutMessage fold directly to its union's matcher instead of wrapping a call that forwards the OutMessage. A pure fold can supply `Update.Step<Model, Message>` as the matcher output, which types its pure Model callbacks directly. For a generic child, pass the refined OutMessage type as the second matcher type argument.

A Command-producing fold can infer its requirements through the owning definition's `makeStep` method, or derive the matcher output from an existing Step producer's `ReturnType`. `Update.Step<Model, Message>` sets requirements to `never` and cannot represent Commands that require handler Layers. Retain collection keys, other context consumed by the matcher branches, and `FoldContext` lifters.

## Layer composition and lifetimes

### Composing Layers

Keep definitions and handlers within the feature whose update returns them, alongside update or in a feature-local `command.ts`. Compose attached recipes directly as `Definition.layer` in each owning module's local `EffectsLayer`. When a recipe needs its own exported or reused binding, name it `FooLayer`; name an external alternative `FooTestLayer`. Pass the local bundle to `FeatureComposition.prepareBlock`; child Bindings included in the Composition contribute their recipes automatically. The typed Application Composition owns root assembly and its graph. `ApplicationComposition.prepareBlock` collects the handler recipes into a passive unfinished assembly, while `Block.assemble` creates the completed Block and `ApplicationLayer` supplies ordinary Services through the Program. Import Effect's module as `Layer`; the bundle names avoid an alias.

Foldkit UI components expose completed Blocks. Bind each component through the owning Definition and include it in the Composition's `bindings`; composition carries its Mounts, lifecycle registrations, and handler graph to the root. `Slider.forRoot(getTrackRoot)` and `Toast.make(payloadSchema)` return completed Blocks with refined Model, Message, and operation contracts.

### Requirements and definition identities

#### Inferred requirements

`Update.define` infers Command requirements and OutMessages across Message branches while preserving required, optional, and rest context parameters. `Update.RequirementsOf<typeof update>` reads the Command services from an update contract without including lifecycle-only services. `ApplicationComposition.prepareBlock` checks handler completeness across the Composition. The completed Program carries the ordinary Service requirements of those handler recipes and startup Effects until `program.provide(ApplicationLayer)` satisfies them.

#### Registration names

Handler names are local to their owning Block. Bindings qualify those identities by placement, so different Blocks and repeated placements can reuse a local name. Sibling Bindings must have distinct resolved placements. Incompatible handler protocols are rejected during assembly, and private definition identity checks reject a provider built from another definition. A ManagedResource retains its handler contract through lifting; each registered resource tag key still has one lifecycle owner.

#### Handler protocols

Handler requirements carry the name and protocol that share an Effect Context key: decoded args and declared result Messages for Commands, decoded dependencies and declared Messages for Subscriptions, element inputs and declared result Messages for Mounts, and decoded acquire params and resource values for ManagedResources. The Block's checked handler assembly rejects incompatible contracts in its local `EffectsLayer` and selected host providers. `provideHandlers` completes explicit host contracts on the original Block. Ordinary Service provision happens after final Application completion.

#### Definition identity checks

Distinct definitions with identical names and protocols remain structurally indistinguishable to TypeScript. Foldkit checks the private definition identity before invoking a Command handler, starting a Subscription, executing a Mount, or beginning a ManagedResource lifecycle, and rejects a Layer built from another definition. Build an external alternative with the original definition's `toLayer` so it retains that definition's identity.

#### ManagedResource ownership

Each registered ManagedResource tag key has one lifecycle owner. `ApplicationComposition.prepareBlock` rejects the same resource key under multiple registration keys, including separately created tags with matching keys. Give independent resource instances distinct tag keys so each accessor resolves its own handle.

### Startup and cleanup

Call `Runtime.run(program.provide(ApplicationLayer), { flags })`. The Runtime checks the Flags value and its required Services against the provided Program. Omit the options argument for a Flags-free application.

Application Layer construction happens before Flags, init, or the first render. A construction failure therefore stops startup before a Model exists for a crash view. `Runtime.hydrate` validates the server handoff before acquiring the application Layer.

ManagedResource release now waits for the explicit callback and scoped finalizers before clearing the handle or dispatching `onReleased`. Cleanup defects are contained so remaining finalizers and the lifecycle transition can complete.
