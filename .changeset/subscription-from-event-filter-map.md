---
'foldkit': minor
---

Add `Subscription.fromEventFilterMap`, a filtered variant of `fromEvent` whose mapper returns `Option<Message>` so a listener can ignore events while still calling `preventDefault()` synchronously.
