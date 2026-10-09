# Application Layers

## Overview

Some Effect services need one instance shared across an application. An RPC client may assemble a transport stack when it starts; an analytics client may keep one session open. Define the service with [Context.Service](https://effect.website/docs/requirements-management/services/), then build its Layer as part of the application’s production Layers.

:::Info{label="Think of it like a restaurant kitchen"}
Shared services are the kitchen equipment available all night. Every dish can use the same oven. A Model-driven handle, such as a camera stream, belongs to a [ManagedResource](/core/managed-resources) instead: it exists only while the Model needs it.
:::

`Application.make` defines the application and carries its unsatisfied Effect requirements. `Application.provide` supplies a Layer before `Runtime.run` starts it. The runtime builds that Layer once per start and releases it when the application stops.

A Command definition names the operation and its result Messages. Its `toLayer` handler can use an Effect service. `Layer.provide` builds that service beneath the handler Layer, so the handler captures it when the Layer is constructed.

::Snippet{name="resources" label="Shared API client service"}

The application requires the `LoadUser` handler service. Its production Layer captures `ApiClientService`; a different handler Layer can supply the same Command in another environment. The API client starts once with the application, rather than once per `LoadUser` execution.

## Shared or Per-Command Provision

A Command handler can also call `Effect.provide` around an individual operation. Choose the placement from the service’s lifetime and identity.

| Question                       | Shared handler dependency                          | Per-Command `Effect.provide`                     |
| ------------------------------ | -------------------------------------------------- | ------------------------------------------------ |
| How often is the Layer built?  | Once when the application starts.                  | Once per Command execution.                      |
| Do Commands share an instance? | Yes, when their handler Layers share its provider. | No. Each execution gets a fresh instance.        |
| What if construction fails?    | Application startup fails before the first render. | The Command handles the failure at its boundary. |
| Can one tag vary by Command?   | One implementation is shared by those handlers.    | Yes. Each Command can provide its own.           |

Common cases follow from that distinction:

- **`HttpClient` can start per Command.** `Effect.provide(Http.layer)` keeps a small HTTP operation self-contained. Foldkit’s `Http.layer` uses Effect’s Fetch-backed client with trace header propagation disabled. Browser `traceparent` headers can turn otherwise CORS-simple requests into preflighted requests against plain APIs and development proxies.
- **`KeyValueStore` often varies by Command.** One operation may use localStorage while another uses sessionStorage. A shared provider would bind only one implementation of that tag.
- **An RPC client is usually shared.** Construction does real work and the Commands using it should reuse the same client. Provide its Layer beneath those handler Layers.

::Snippet{name="resourcesPerCommandHttp" label="Per-Command HTTP"}

When many HTTP Commands share a derived client, compose their handler Layers and provide the client Layer underneath that bundle. This builds the client once and lets every handler capture it. An Effect-level test can provide a mock service while constructing a handler Layer.

## Services in Flags

The Flags Effect can require services too. `Runtime.run` resolves Flags before calling init, so an application Layer that supplies a Flags dependency must build during startup.

::Snippet{name="resourcesFlags" label="Flags consuming a resource"}

If the service Layer fails to build, startup cannot reach init or the first render. There is no Model for a crash view yet. Provide a service used only by Flags with `Effect.provide` inside the Flags Effect when it does not need an application lifetime. Reading persisted startup state through `KeyValueStore` is a common case.

`Application.make` carries requirements from init, update, Subscriptions, and ManagedResources. `Runtime.run` requires those requirements to be supplied. A Flags Effect can use a service produced by `Application.provide`, as shown above.

## Providing Multiple Services

Use `Layer.mergeAll` to combine service Layers. Provide the result beneath the feature handler Layers that need them, then supply the composed Layer to the application. The next snippet assumes `LoadUserLive`, `TrackPageViewLive`, and `ComputePreviewLive` are defined beside their Commands.

::Snippet{name="resourcesMultiple" label="Multiple shared services"}

The provider Layer and its handler Layers live for the application runtime. When a camera stream, `WebSocket`, or other handle should exist only while the Model is in a particular state, use [Managed Resources](/core/managed-resources) instead.
