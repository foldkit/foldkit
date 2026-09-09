# Resources

## Overview

Commands are self-contained by default. Each execution starts fresh with no shared state. Some services instead need one long-lived instance shared across Commands. An RPC client may assemble a serialization and transport stack at construction; an analytics client may open one session for the whole app. Put those services in `resources`.

:::Info{label="Think of it like a restaurant kitchen"}
Resources are the kitchen equipment that stays available all night. Every dish can use the same oven; the kitchen does not install a new one for each order. An `RpcClient` or analytics client has the same app-wide lifetime. Combine several service Layers with `Layer.mergeAll`.
:::

Define a service with [Context.Service](https://effect.website/docs/requirements-management/services/), then pass its Layer through the runtime’s `resources` config. The runtime builds that Layer once, the first time it is needed: during startup when a fresh Flags Effect resolves or Subscriptions begin, otherwise when the first Command runs. It shares the built services for the runtime’s lifetime and releases them at teardown. Commands access a service by yielding its tag.

::Snippet{name="resources" label="resources example"}

Commands declare their resource requirements in the type signature via the third type parameter of `Command`. This makes dependencies explicit and type-checked. If a Command requires a service that isn’t provided via `resources`, you’ll get a compile error.

## Resources or Per-Command Provision

A Command can also satisfy a service requirement locally with `Effect.provide`. Choose the placement from the service’s intended lifetime and identity.

| Question                       | `resources`                                      | Per-Command `Effect.provide`                     |
| ------------------------------ | ------------------------------------------------ | ------------------------------------------------ |
| How often is the Layer built?  | Once for the runtime.                            | Once per Command execution.                      |
| Do Commands share an instance? | Yes.                                             | No. Each execution gets a fresh instance.        |
| What if construction fails?    | The runtime fails loudly through its crash path. | The Command handles the failure at its boundary. |
| Can one tag vary by Command?   | No. One implementation is bound for the runtime. | Yes. Each Command can provide its own.           |

Common cases follow directly from that distinction:

- **`HttpClient` starts per Command.** `Effect.provide(Http.layer)` keeps the Command self-contained, and the Layer is only a thin wrapper around `fetch`. Foldkit’s `Http.layer` uses Effect’s Fetch-backed client with trace header propagation disabled. Browser `traceparent` headers can turn otherwise CORS-simple requests into preflighted requests against plain APIs and development proxies.
- **`KeyValueStore` stays per Command.** The backing store is often part of the operation: one Command may use localStorage while another uses sessionStorage. A runtime-wide Layer could bind only one implementation of the tag.
- **An RPC client belongs in `resources`.** Construction does real work, every Command should reuse the same client, and broken configuration should produce one visible failure rather than isolated failures across every server operation.

::Snippet{name="resourcesPerCommandHttp" label="per-Command HTTP example"}

An HTTP client can still graduate. When an app grows many HTTP Commands, or shares a derived `HttpApiClient` across modules, provide `Http.layer` once via `resources` instead. The moment you find yourself writing a `withClient` helper to cut the repetition is the signal. Providing at the edge also helps tests: the Command’s Effect keeps `HttpClient` in its requirements, so an Effect-level test can provide a mock with `Layer.succeed(HttpClient.HttpClient, mockClient)` directly. A per-Command provide needs a separately exported raw Effect to test the same way.

## Resources in Flags

The Flags Effect can require services too. The runtime provides them from the same `resources` Layer used by Commands and Subscriptions, so a client needed during startup and later work is still constructed only once.

::Snippet{name="resourcesFlags" label="Flags consuming a resource"}

During a fresh boot, Flags resolve before init. An application with Flags therefore attempts to build its `resources` Layer during startup instead of waiting for the first Command.

:::Warning{label="Failure before the first render"}
If the Flags Effect needs a service whose Layer fails to build, startup cannot reach init or the first render. There is no Model for the crash view yet, so startup fails directly. The Layer build cause remains visible alongside any unrelated Flags failure. If Flags can resolve without the broken service, the app can render; the cached Layer failure then reaches the crash view when the first Command or Subscription needs it.
:::

Requirements are checked where the Effect is supplied: at `Runtime.run` for an application and in `makeElement` for an element. Let inference connect those requirements to the `resources` Layer. Explicitly naming the `Resources` type argument can detach the requirement from a concrete Layer and bypass that check.

Provide a service used only by Flags with `Effect.provide` inside the Flags Effect, just as you would inside a Command. Reading persisted startup state through `KeyValueStore` is the common case.

## Providing Multiple Services

The `resources` field takes a single `Layer`, but Effect layers compose. Use `Layer.mergeAll` to combine multiple service layers into one.

::Snippet{name="resourcesMultiple" label="multiple resources example"}

Resources live for the entire runtime. When a camera stream, `WebSocket`, or other handle should exist only while the Model is in a particular state, use [Managed Resources](/core/managed-resources) instead.
