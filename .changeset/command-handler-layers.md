---
'foldkit': minor
---

Allow Command definitions to omit `execute` and supply their implementation with `Definition.toLayer(handler)` or `Definition.toLayer(Effect<handler>)`. Layer-backed Commands carry a named handler service requirement. The handler Layer captures its construction context, while services present when the Command runs take precedence.

Named Subscription entries can supply their Stream factory with `entry.toLayer(handler)` or an Effect-built handler. Named ManagedResource entries can supply their acquire and release functions with `entry.toLayer({ acquire, release })` or an Effect-built handler. Both keep their Model-driven lifecycles and existing registration keys.

`Update.make` infers Command requirements and OutMessages across Message branches while preserving required, optional, and rest context parameters. An update that emits an OutMessage retains `ReturnWithOutMessage` so a parent must handle it; an update without one retains `Return`. `Update.RequirementsOf<typeof update>` reads the Command services from an update contract without including services used only by lifecycle registrations. `Application.make` and `Application.provide` carry Command, Subscription, and ManagedResource handler requirements until Layers satisfy them. The application infers runtime-provided ManagedResource access services, supports Flags and routing, and builds provided Layers once per runtime lifetime after resource accessors and Port channels exist.

Each handler name belongs to one definition within an application. `Application.make` rejects distinct named Subscription or ManagedResource definitions with the same name. A Command reports a mismatched Layer when it runs, since Command definitions are created inside update rather than registered with the application. Multiple lifted uses of the same definition can share its Layer.

Layer-backed Mount definitions use `toLayer` for one-shot Effects and Streams. Register each definition in `Application.make({ mounts: [...] })` so its handler requirement enters the application type. Foldkit validates rendered Mount identities before patching, carries application Layers into Mount execution, and finishes Mount cleanup before releasing those Layers.
