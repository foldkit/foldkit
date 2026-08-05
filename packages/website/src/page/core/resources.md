# Resources

## Overview

Commands are self-contained by default. Each execution starts fresh with no shared state. But some services need a single long-lived instance shared across Commands: clients that do real work at construction time, like an RPC client assembling its serialization and transport stack, or an analytics client that opens one session for the whole app. That’s what `resources` is for.

:::Info{label="Think of it like a restaurant kitchen"}
Resources are kitchen equipment: the oven, the stand mixer, the deep fryer. They’re turned on when the kitchen opens and run all night. Every dish (Command) can use them. You don’t buy a new oven per order. An `RpcClient` and an analytics client are the same: expensive singletons that live for the entire app lifecycle. Need multiple pieces of equipment? Combine them with `Layer.mergeAll`.
:::

Define a service using [Context.Service](https://effect.website/docs/requirements-management/services/), then pass its default layer to `makeApplication` via the `resources` config field. The runtime builds the Layer once, the first time it is needed: at startup when `Runtime.run` receives a Flags Effect or Subscriptions begin, otherwise when the first Command runs. The built services are shared for the application’s lifetime and released at teardown. Commands access a service by yielding its tag.

::Snippet{name="resources" label="resources example"}

Commands declare their resource requirements in the type signature via the third type parameter of `Command`. This makes dependencies explicit and type-checked. If a Command requires a service that isn’t provided via `resources`, you’ll get a compile error.

## Resources or Per-Command Provision

A Command can also discharge a requirement itself, with `Effect.provide` inside its Effect. Both placements work, so the question is which one a given service should use. The deciding lens: is the service an app-wide singleton every Command should reuse, or a per-Command decision where different Commands want different implementations? Four criteria sharpen the call.

- **Construction cost times invocation frequency.** A per-Command `Effect.provide` builds the layer on every invocation. For `Http.layer` from `foldkit/http`, a thin wrapper around `fetch`, that costs nothing. For an RPC client that assembles a serialization and transport stack, it means a Command that fires on every keystroke rebuilds the whole stack each time. Services whose construction does real work belong in `resources`, where construction happens once.
- **Instance identity.** A per-Command provide constructs a fresh instance for each invocation, so Commands never share state through it. When every Command must talk to the same object, like one `RpcClient` that multiplexes their calls over a single connection, the service belongs in `resources`.
- **Failure isolation versus fail-fast.** A per-Command provide scopes construction failure to the Commands that use the service: if the layer can’t be built, those Commands fail and the rest of the app keeps working. `resources` is the opposite contract. The runtime provides the Layer to every Command, so a Layer that fails to build crashes the app with the crash view. For a service the whole app depends on, that one loud failure is the better behavior; for a genuinely optional service, per-Command provision keeps the failure contained.
- **Same tag, different implementations.** `resources` binds each service tag to one implementation for the whole app. Only per-Command provides can give two Commands different implementations of the same tag, like one Command using `KeyValueStore` over localStorage while another uses it over sessionStorage.

Run the criteria over the common cases and the split falls out. `HttpClient` defaults to per-Command: `Effect.provide(Http.layer)` is one line, the Command stays self-contained, and no type annotations change anywhere else. `Http.layer` from `foldkit/http` is Effect’s Fetch-backed client with trace header propagation disabled by default. Effect tunes that default for servers, where handing trace context to your own downstream services is desirable; in the browser the same `traceparent` headers make otherwise CORS-simple requests trigger preflights against plain APIs and dev proxies. `KeyValueStore` stays per-Command: which storage backs the tag is a per-Command decision, and `resources` could only pick one. An RPC client goes in `resources`: construction is expensive, every Command should reuse one client, and when its configuration is broken, one visible failure the first time the client is needed tells you more than every server call failing on its own.

::Snippet{name="resourcesPerCommandHttp" label="per-Command HTTP example"}

An HTTP client can still graduate. When an app grows many HTTP Commands, or shares a derived `HttpApiClient` across modules, provide `Http.layer` once via `resources` instead. The moment you find yourself writing a `withClient` helper to cut the repetition is the signal. Providing at the edge also helps tests: the Command’s Effect keeps `HttpClient` in its requirements, so an Effect-level test can provide a mock with `Layer.succeed(HttpClient.HttpClient, mockClient)` directly. A per-Command provide needs a separately exported raw Effect to test the same way.

## Resources in Flags

The Flags Effect passed to `Runtime.run` can require services too. Declare them in its type and the runtime provides them from the same `resources` Layer it gives Commands and Subscriptions, so a client needed both at startup and by Commands is constructed once rather than once per consumer.

::Snippet{name="resourcesFlags" label="Flags consuming a resource"}

During fresh boot, Flags resolve before `init`, so a Flags Effect that requires a Resource builds the Layer at startup rather than on the first Command. A Layer that fails to build still reaches the crash view, with one exception. When the Flags Effect itself needs the broken service it cannot proceed, and it fails before the first render, where there is no Model for the crash view to render against. That case fails startup, and neither cause is swallowed, so a Flags Effect that fails for its own unrelated reason stays visible alongside the build error. Every other case is unchanged: the app starts, and the failure reaches the crash view at the first Command or Subscription that needs the Layer.

Requirements are checked where the Effect is supplied: `Runtime.run` for an application and `makeElement` for an element. A Flags Effect requiring a service that `resources` does not provide is a compile error whenever `Resources` is inferred from `resources`. Naming it explicitly in the type arguments detaches it from any Layer, which is the same gap Commands already have. Provide a service the Flags Effect alone needs with `Effect.provide` inside `flags` instead, exactly as a Command does: `KeyValueStore` reading persisted state at startup is the common case, and it belongs there rather than in `resources`.

## Providing Multiple Services

The `resources` field takes a single `Layer`, but Effect layers compose. Use `Layer.mergeAll` to combine multiple service layers into one.

::Snippet{name="resourcesMultiple" label="multiple resources example"}

Resources live for the entire application. But what if a resource should only exist while the Model is in a certain state, like a camera stream during a video call, or a `WebSocket` while on a chat page? That’s what [Managed Resources](/core/managed-resources) are for.
