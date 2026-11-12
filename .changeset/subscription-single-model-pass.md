---
'foldkit': patch
---

Following the Model now costs one dependency pass per Model change instead of waking one fiber per Subscription.

Before, every Subscription subscribed to the Model on its own and ran its own fiber, so every Model change woke every Subscription's fiber to derive its dependencies and compare them, even when nothing it depended on changed. With a few hundred Subscriptions that fan-out dominated the time spent on each Message.

Now one fiber follows the Model, derives every Subscription's dependencies in a single synchronous pass, and hands new dependencies only to the Subscriptions whose dependencies changed under their equivalence.

What a Subscription observes is unchanged. Its stream still restarts exactly when its dependencies change under its schema equivalence or `keepAliveEquivalence`, `readDependencies` still returns the latest dependencies on every Model, slow-dependency warnings are reported per Subscription as before, and a defect in `modelToDependencies` still shows the crash view.
