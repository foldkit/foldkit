---
'foldkit': minor
---

Subscriptions declare the Message Schemas their Streams can emit. Use `entry('HeartbeatTicks', { messages: [Message.Ticked] }, constructor)` when there are no local Model dependencies, or pass the constructor after the dependency fields and callbacks config for a dependency-bearing entry. The entry exposes the attached recipe as `.layer`; `toLayer` remains available for an external alternative. An empty declaration constrains a silent Subscription to `Stream<never>`. The declaration and handler Layer remain available after `Subscription.lift` and direct `Subscription.aggregate(records...)`, providing a stable source and output contract for Scene.

Remove uses of `Subscription.persistentEntry`, `Subscription.animationFrameEntry`, and `Port.subscriptionEntry`. Define ordinary named entries instead. Build port handlers from `Port.stream(port)`. Map the cold `Subscription.animationFrameStream` to the entry's Message in its handler; each subscriber owns its animation loop and cancels the pending frame request when its scope closes.
