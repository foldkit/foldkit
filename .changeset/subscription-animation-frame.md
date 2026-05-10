---
'foldkit': minor
---

Add `Subscription.animationFrame`, a Subscription helper that emits a Message every `requestAnimationFrame` tick with the inter-frame delta in milliseconds.

```ts
import { Subscription } from 'foldkit'

const SubscriptionDeps = S.Struct({ frame: S.Boolean })

const subscriptions = Subscription.makeSubscriptions(SubscriptionDeps)<
  Model,
  Message
>({
  frame: Subscription.animationFrame({
    isActive: model => model.isPlaying,
    toMessage: deltaTime => TickedFrame({ deltaTime }),
  }),
})
```

`isActive` returning `false` tears the rAF loop down entirely (game paused, scene static, animation finished); the loop restarts when the gate flips back. Pair with `S.Boolean` in your `SubscriptionDeps` schema.

Reach for `Subscription.animationFrame` whenever you want smooth, time-based motion driven by Model updates: physics simulations, generative art, parallax scrolling, custom interpolations. The `deltaTime` payload makes simulation speed independent of frame rate. For discrete game ticks (one step every N ms regardless of refresh rate), `Stream.tick` is still the right primitive.
