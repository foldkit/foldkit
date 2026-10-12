---
'foldkit': minor
---

Remove the `resources` configuration field from `Runtime.makeApplication` and `Runtime.makeElement`. Define programs with `Application.make` or `Application.makeElement`, then supply application-lifetime Layers with `Application.provide` before calling `Runtime.run`, `Runtime.hydrate`, or `Runtime.embed`.

`Runtime.makeApplication` and `Runtime.makeElement` accept self-contained configurations with no unmet Effect requirements. Use `Application.make` and `Application.makeElement` for programs that need handler Layers or shared service providers. Their requirements must be satisfied with `Application.provide` before the program can start.

Application Layers build eagerly once for each runtime start and release when that runtime stops. They are available to Flags, Commands, Subscriptions, Mounts, and ManagedResources. This differs from the removed `resources` field, which deferred construction until Flags, a Command, or a Subscription first requested its services. An application Layer build failure stops startup before the first render, where no Model exists for a crash view.

`Runtime.hydrate` validates the server build identity and Flags payload before acquiring application Layers. A refused handoff contains the served page before any application Layer can start work or fail to build.
