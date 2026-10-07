---
'foldkit': minor
---

Rename the entry factories to match what they return. Replace `Subscription.persistent` with `Subscription.persistentEntry`, `Subscription.animationFrame` with `Subscription.animationFrameEntry`, and `Port.subscription` with `Port.subscriptionEntry`. Pass the returned entries to `Subscription.make` to construct a Subscriptions record.
