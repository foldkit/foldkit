---
'foldkit': minor
---

Layer-backed Subscriptions declare the Message schemas their Streams can emit. Use `entry('HeartbeatTicks', { messages: [Message.Ticked] })` when there are no local Model dependencies, or add `messages` beside `modelToDependencies` for a dependency-bearing entry. An empty declaration constrains a silent Subscription to `Stream<never>`. The declaration and handler Layer remain available after `Subscription.lift` and direct `Subscription.aggregate(records...)`, providing a stable source and output contract for future application testing.
