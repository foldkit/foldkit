---
'foldkit': minor
---

Remove `Runtime.makeApplication` and `Runtime.makeElement`, including their `resources` configuration field. Establish `Application` with `defineApplication` from `foldkit`, then create `ApplicationComposition` with `Application.makeComposition(...)`. Complete it through `ApplicationComposition.makeApplication` or `ApplicationComposition.makeElement`, then supply application-lifetime Services through `application.provide(layer)` or `element.provide(layer)` before calling `Runtime.run`, `Runtime.hydrate`, or `Runtime.embed`.

The Composition methods are factories: they return passive runtime inputs and do not execute application behavior. Only the Runtime starts the application or Element.

The Composition captures Model, Message, child Bindings, and Mount capabilities. Pass local init, update, view, lifecycle declarations, and handler recipes to completion. Remaining Service requirements must be satisfied before the program can start.

Application Layers build eagerly once for each runtime start and release when that runtime stops. They are available to Flags, Commands, Subscriptions, Mounts, and ManagedResources. This differs from the removed `resources` field, which deferred construction until Flags, a Command, or a Subscription first requested its services. An application Layer build failure stops startup before the first render, where no Model exists for a crash view.

`Runtime.hydrate` validates the server build identity and Flags payload before acquiring application Layers. A refused handoff contains the served page before any application Layer can start work or fail to build.
