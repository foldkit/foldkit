---
'foldkit': minor
---

Subscriptions declare the Message Schemas their Streams can emit. Use `entry('HeartbeatTicks', { messages: [Message.Ticked], handler: function* () { return () => stream } })` when there are no local Model dependencies, or put the same `handler` field in the callbacks config for a dependency-bearing entry. Foldkit applies `Effect.gen` internally. The entry exposes the attached recipe as `.layer`; `toLayer` remains available for an external alternative.

The handler name identifies the Layer requirement that application assembly must satisfy. The record key identifies the runtime registration whose Stream Foldkit starts and stops. Several lifted registrations can share one definition and handler Layer while keeping separate Stream scopes. Subscription lifecycle display in DevTools remains follow-up work.

The declared Message Schemas constrain the attached handler and external `toLayer` implementations. An undeclared output is a type error; an empty declaration constrains a silent Subscription to `Stream<never>`. Scene uses the declarations to validate an emitted Message against its registered Subscription source, including Message mappings through parent Submodels. The declarations and handler Layer remain available after `Subscription.lift` and direct `Subscription.aggregate(records...)`.

Remove uses of `Subscription.persistentEntry`, `Subscription.animationFrameEntry`, and `Port.subscriptionEntry`. Define ordinary named entries instead. Replace `Subscription.persistentEntry(stream)` with `entry(name, { messages, handler: function* () { return () => stream } })`, then provide the entry's `.layer`.

For an animation frame entry whose Model has `isPlaying`, migrate the helper to a dependency-bearing entry. Map the cold `Dom.animationFrameTicks` Stream to the entry's Message in its handler. The raw browser source belongs to `Dom`; the Subscription owns its Model condition and Message mapping. Each subscriber owns its animation loop and cancels the pending frame request when its scope closes.

**Before**

```ts
const subscriptions = Subscription.make<Model, Message>()(_entry => ({
  animationFrameTicks: Subscription.animationFrameEntry({
    isActive: model => model.isPlaying,
    toMessage: deltaTime => Message.TickedFrame({ deltaTime }),
  }),
}))
```

**After**

```ts
const subscriptions = Subscription.make<Model, Message>()(entry => ({
  animationFrameTicks: entry(
    // A named handler replaces the anonymous animation-frame helper.
    'AnimationFrameTicks',
    { isActive: Schema.Boolean },
    {
      messages: [Message.TickedFrame],
      modelToDependencies: model => ({ isActive: model.isPlaying }),
      handler: function* () {
        // The Subscription owns activation and Message mapping; Dom owns the source.
        return ({ isActive }) =>
          isActive
            ? Dom.animationFrameTicks.pipe(
                Stream.map(deltaTime => Message.TickedFrame({ deltaTime })),
              )
            : Stream.empty
      },
    },
  ),
}))

const EffectsLayer = subscriptions.animationFrameTicks.layer
```

Build inbound Port handlers from `Port.stream(port)`. This example assumes `ports.inbound.stepChanged` is an inbound Port and `appSubscriptions` is the application's existing Subscription record.

**Before**

```ts
const portSubscriptions = Subscription.make<Model, Message>()(_entry => ({
  hostStep: Port.subscriptionEntry(ports.inbound.stepChanged, step =>
    Message.ChangedStep({ step }),
  ),
}))

const subscriptions = Subscription.aggregate(
  appSubscriptions,
  portSubscriptions,
)
```

**After**

```ts
const portSubscriptions = Subscription.make<Model, Message>()(entry => ({
  hostStep: entry('HostStepChanges', {
    messages: [Message.ChangedStep],
    handler: function* () {
      // Consume the Port's decoded values, then map to declared Messages.
      return () =>
        Port.stream(ports.inbound.stepChanged).pipe(
          Stream.map(step => Message.ChangedStep({ step })),
        )
    },
  }),
}))

const subscriptions = Subscription.aggregate(
  appSubscriptions,
  portSubscriptions,
)
// Registering the Subscription and supplying its handler are separate steps.
const EffectsLayer = portSubscriptions.hostStep.layer
```
