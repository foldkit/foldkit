---
'foldkit': minor
---

Move route transitions into a `Transition` namespace on `foldkit/route` and add constructors.

`Transition.make(previousRoute, nextRoute)` builds the transition for an in-app navigation, and `Transition.coldLoad(nextRoute)` builds the cold load case, so applications no longer construct the record and its `Option` by hand.

`Transition.entered` returns the route a transition entered as an `Option`: `Some(nextRoute)` on a tag change or a cold load, `None` for navigation within one route. Applications with entry Commands on several routes match on it once instead of stacking predicates, and `isEntering` is now defined in terms of it.

Breaking: `Route.isEntering` is now `Transition.isEntering`, and the `RouteTransition` type is now `Transition.Transition`. Migration:

```ts
// Before
import { Route } from 'foldkit'

const isEntering = Route.isEntering<AppRoute>
type AppTransition = Route.RouteTransition<AppRoute>

// After
import { Transition } from 'foldkit/route'

const isEntering = Transition.isEntering<AppRoute>
type AppTransition = Transition.Transition<AppRoute>
```

The namespace also hangs off the `Route` export, so `Route.Transition.isEntering` works without the subpath import.
