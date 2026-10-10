---
'foldkit': minor
---

Subscriptions declare the Message Schemas their Streams can emit. Use `entry('HeartbeatTicks', { messages: [Message.Ticked] }, constructor)` when there are no local Model dependencies, or pass the constructor after the dependency fields and callbacks config for a dependency-bearing entry. The entry exposes the attached recipe as `.layer`; `toLayer` remains available for an external alternative. An empty declaration constrains a silent Subscription to `Stream<never>`. The declaration and handler Layer remain available after `Subscription.lift` and direct `Subscription.aggregate(records...)`, providing a stable source and output contract for Scene.

Remove uses of `Subscription.persistentEntry`, `Subscription.animationFrameEntry`, and `Port.subscriptionEntry`. Define ordinary named entries instead. Replace `Subscription.persistentEntry(stream)` with `entry(name, { messages }, Effect.succeed(() => stream))`, then provide the entry's `.layer`.

For an animation frame entry whose Model has `isPlaying`, migrate the helper to a dependency-bearing entry. Map the cold `Subscription.animationFrameStream` to the entry's Message in its handler. Each subscriber owns its animation loop and cancels the pending frame request when its scope closes.

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
    'AnimationFrameTicks',
    { isActive: Schema.Boolean },
    {
      messages: [Message.TickedFrame],
      modelToDependencies: model => ({ isActive: model.isPlaying }),
    },
    Effect.succeed(({ isActive }) =>
      isActive
        ? Subscription.animationFrameStream.pipe(
            Stream.map(deltaTime => Message.TickedFrame({ deltaTime })),
          )
        : Stream.empty,
    ),
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
  hostStep: entry(
    'HostStepChanges',
    { messages: [Message.ChangedStep] },
    Effect.succeed(() =>
      Port.stream(ports.inbound.stepChanged).pipe(
        Stream.map(step => Message.ChangedStep({ step })),
      ),
    ),
  ),
}))

const subscriptions = Subscription.aggregate(
  appSubscriptions,
  portSubscriptions,
)
const EffectsLayer = portSubscriptions.hostStep.layer
```
