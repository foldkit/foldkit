---
'foldkit': minor
---

Complete the `Transition` vocabulary with `enteredRoute`, `exited`, `exitedRoute`, and `stayed`.

`Transition.enteredRoute(transition, tag)` and `Transition.exitedRoute(transition, tag)` are the single-route, payload-carrying forms of `entered` and `exited`: they return the entered or exited route narrowed to the given tag, so an entry Command for a detail route gets its payload typed without a full match.

`Transition.exited(transition)` mirrors `entered`: `Some(previousRoute)` when the transition left a route, `None` on a cold load or within-route navigation. It is for one-shot Commands on the way out, like saving a draft. Things that live while a route is active still belong to a Subscription or ManagedResource condition on the Model.

`Transition.stayed(transition, tag)` returns both sides of a within-route navigation, narrowed to the tag: `Some({ previousRoute, nextRoute })` when the transition stayed on that route, `None` when it entered it, left it, or never touched it. For reacting to payload changes within one route when the previous value matters.

`Transition.isEntering(transition, tag)` is the boolean view of `enteredRoute`. Every tag-taking helper infers the route union from the transition argument, so the tag is checked against the union's tags with no pinned alias anywhere. The migration from the released curried `Route.isEntering` is covered by the Transition namespace changeset.
