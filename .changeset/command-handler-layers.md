---
'foldkit': minor
---

Allow Command definitions to omit `execute` and supply their implementation with `Definition.toLayer(handler)` or `Definition.toLayer(Effect<handler>)`. Layer-backed Commands carry a named handler service requirement. The handler Layer captures its construction context, while services present when the Command runs take precedence.

Named Subscription entries can supply their Stream factory with `entry.toLayer(handler)` or an Effect-built handler. Named ManagedResource entries can supply their acquire and release functions with `entry.toLayer({ acquire, release })` or an Effect-built handler. Both keep their Model-driven lifecycles and existing registration keys.

`Update.make` preserves the union of Command requirements across Message branches while validating the update return contract. `Application.make` and `Application.provide` carry Command, Subscription, and ManagedResource handler requirements until Layers satisfy them. The application infers runtime-provided ManagedResource access services, supports Flags and routing, and builds provided Layers once per runtime lifetime after resource accessors and Port channels exist.
