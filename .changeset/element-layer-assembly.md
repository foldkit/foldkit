---
'foldkit': minor
---

Add `Application.makeElement` for container-scoped apps whose effect requirements are supplied with `Application.provide`. It infers requirements from the configured Flags Effect, init and update Commands, Subscriptions, registered Mounts, and ManagedResources. A fully provided Element can be passed to `Runtime.run` or `Runtime.embed`, and its Layers share one runtime lifetime with Ports and the Element's Model-driven effects.
