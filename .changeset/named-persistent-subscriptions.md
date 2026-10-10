---
'foldkit': minor
---

Subscriptions declare the Message Schemas their Streams can emit. Use `entry('HeartbeatTicks', { messages: [Message.Ticked] })` when there are no local Model dependencies, or add `messages` beside `modelToDependencies` for a dependency-bearing entry. Supply the implementation with `entry.toLayer(Effect<handler>)`. An empty declaration constrains a silent Subscription to `Stream<never>`. The declaration and handler Layer remain available after `Subscription.lift` and direct `Subscription.aggregate(records...)`, providing a stable source and output contract for Scene.

Remove uses of `Subscription.persistentEntry`, `Subscription.animationFrameEntry`, and `Port.subscriptionEntry`. Define ordinary named entries instead. Build port handlers from `Port.stream(port)`. Map the cold `Subscription.animationFrameStream` to the entry's Message in its handler; each subscriber owns its animation loop and cancels the pending frame request when its scope closes.
