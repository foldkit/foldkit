---
'@foldkit/oxlint-plugin': minor
---

Adds `foldkit/no-prevent-default-in-stream-operator`, which flags `event.preventDefault()` inside callbacks passed to `Stream.map`, `Stream.mapEffect`, `Stream.filterMap`, `Stream.filterMapEffect`, `Stream.filter`, `Stream.filterEffect`, or `Stream.tap`, including callbacks referenced by name and aliased Stream imports. DOM events flow through the Stream before downstream operators run, so cancellation there is too late. The fix is `Subscription.fromEventPreventDefault`, which calls `preventDefault()` for every handled event before the native listener returns. The rule is on at error severity in `recommended`.
