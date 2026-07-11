---
'foldkit': minor
---

Move route transitions into a `Transition` namespace on `foldkit/route` and add constructors.

`Transition.make(previousRoute, nextRoute)` builds the transition for an in-app navigation, and `Transition.coldLoad(nextRoute)` builds the cold load case, so applications no longer construct the record and its `Option` by hand.

`Transition.entered` returns the route a transition entered as an `Option`: `Some(nextRoute)` on a tag change or a cold load, `None` for navigation within one route. Applications with entry Commands on several routes match on it once instead of stacking predicates, and `isEntering` is now defined in terms of it.

Breaking: `Route.isEntering` is now `Transition.isEntering` and takes the transition data-first, and the `RouteTransition` type is now `Transition.Transition`. Before:

```ts
import { Route } from 'foldkit'

const isEntering = Route.isEntering<AppRoute>
isEntering('Gallery')(transition)
type AppTransition = Route.RouteTransition<AppRoute>
```

After:

```ts
import { Transition } from 'foldkit/route'

Transition.isEntering(transition, 'Gallery')
type AppTransition = Transition.Transition<AppRoute>
```

The namespace also hangs off the `Route` export, so `Route.Transition.isEntering` works without the subpath import.
