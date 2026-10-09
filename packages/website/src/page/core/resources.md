# Application Layers

## Overview

Some Effect services need one instance shared across an application. An RPC client may assemble a transport stack when it starts; an analytics client may keep one session open. Define the service with [Context.Service](https://effect.website/docs/requirements-management/services/), then build its Layer as part of the application’s production Layers.

:::Info{label="Think of it like a restaurant kitchen"}
Shared services are the kitchen equipment available all night. Every dish can use the same oven. A Model-driven handle, such as a camera stream, belongs to a [ManagedResource](/core/managed-resources) instead: it exists only while the Model needs it.
:::

`Application.make` defines the application and carries its unsatisfied Effect requirements. `Application.provide` adds a Layer recipe before `Runtime.run` starts the program. The Runtime builds the application Layer once per start and releases it when the application stops. Looking up a Command handler or restarting a Subscription does not rebuild the Layer or its providers. A hydrating start validates the server handoff before acquiring any application Layer.

A Command definition names the operation and its result Messages. Its `toLayer` handler can use an Effect service. `Layer.provide` composes that service Layer beneath the handler Layer. An Effect constructor can capture the provided instance when the application Layer is built, while a plain handler can look it up during each invocation. The same boundary applies to Layer-backed Subscriptions, Mounts, and ManagedResources.

::Snippet{name="resources" label="Shared API client service"}

The application requires the `LoadUser` handler service. `LoadUserLayer` is the real handler in both compositions. Production supplies `ApiLayer`; a test supplies `ApiTestLayer`. The API client starts once with the application, rather than once per `LoadUser` execution. `TestLayer` covers the real `LoadUser` mapping and error policy, but it does not cover the replaced `ApiLayer` request and decoder.

Calling `toLayer` creates a recipe for providing the handler service. Passing an Effect to `toLayer` makes that recipe run a constructor once when the Runtime builds the application Layer. For a Command, the returned handler receives serializable args each time the Command runs.

The Effect constructor is useful when capturing a stable injected service or accessor makes the dependency boundary clear. It may capture `ApiClientService`, for example. Do not capture current time, Command args, Subscription dependencies, a Mount's element, or an active ManagedResource handle. Those values belong to the shorter-lived operation or lifecycle that supplies them.

Looking up an Effect service uses an instance from the current context; the lookup does not construct its provider. A service captured by the constructor remains that instance for the runtime start. A later invocation context cannot replace the captured value. A handler that performs the lookup during invocation can see invocation-specific services instead, because Foldkit merges contexts with invocation services taking precedence.

## Testing Through Service Boundaries

Whole-application execution tests retain the real Command, Subscription, Mount, and ManagedResource handlers. Replace the dependency Layers beneath those handlers before the Runtime builds the application Layer: an API client, storage service, RPC transport, clock, or browser capability. This exercises the application's real effect translation and lifecycle behavior while making the external environment deterministic.

Choose the lowest service boundary whose code the test needs to exercise. If `ApiLayer` contains request construction, authentication, decoding, retries, or other business behavior, keep `ApiLayer` and replace its lower HTTP or RPC transport. Replacing `ApiLayer` with `ApiTestLayer` deliberately narrows the test to code above that service.

For a Subscription, the test service supplies the upstream events while the real handler still builds the Stream and Foldkit still starts, restarts, and stops it from Model dependencies. For a Mount, the test capability sits beneath the real element-scoped handler. For a ManagedResource, the test capability sits beneath the real acquire and release handler, so the Model-driven handle scope remains under test.

A handler stub is a narrower orchestration choice. It can drive a result path directly, but it does not test the handler that was replaced. Inline Command, Subscription, and ManagedResource definitions are also testable through their Effect requirements; they do not need to be converted to `toLayer` only to substitute dependencies. An inline Mount cannot leave an app service requirement open, so use a Layer-backed Mount when the application or a whole-application test must choose that provider.

## Choosing the Lifetime

Put a value in the scope that owns its start and stop:

| Lifetime              | Use it for                                       | Examples                                                 |
| --------------------- | ------------------------------------------------ | -------------------------------------------------------- |
| One Runtime start     | Shared Effect services and constructed handlers  | RPC clients, repositories, analytics clients             |
| One Command execution | Work and values produced for one dispatch        | Current time, request args, one HTTP response            |
| A Model condition     | Subscription Streams and ManagedResource handles | Route-scoped events, a connected socket, a camera stream |
| One mounted element   | Mount acquisition and cleanup                    | Element observers, chart instances, anchored overlays    |

The application Layer may construct a stable service or handler accessor. It must not move values from the other three scopes into application lifetime. A current timestamp changes per Command. Subscription dependencies change with the Model. A ManagedResource handle exists only while its Model condition holds. A Mount's `Element` exists only for that mounted node.

## Application and Private Provider Lifetimes

Put concrete HTTP, storage, RPC, and browser providers in the application root by default. This gives production and whole-application tests one visible substitution boundary while the feature keeps its real handlers.

| Question                         | Application-root provider                          | Private `Effect.provide`                           |
| -------------------------------- | -------------------------------------------------- | -------------------------------------------------- |
| How often is the Layer built?    | Once when the application starts.                  | Once per operation execution.                      |
| Do operations share an instance? | Yes, when their handlers require the same service. | No. Each execution gets a fresh instance.          |
| Where can a test substitute it?  | At the root, while retaining every real handler.   | Only inside a direct test of that private Effect.  |
| What if construction fails?      | Application startup fails before the first render. | The operation handles the failure at its boundary. |

Use a private provider only when the operation deliberately owns that provider and the application should not select or share it. This closes the provider inside the Effect, so the root cannot replace it for a whole-application execution test.

When an application needs localStorage and sessionStorage at the same time, define distinct application service tags such as `LocalStorage` and `SessionStorage`. Bind each tag to its platform `KeyValueStore` Layer at the root. The tags preserve both identities without hiding either provider inside a Command.

::Snippet{name="resourcesPerCommandHttp" label="HTTP provider at the application root"}

Foldkit’s `Http.layer` uses Effect’s Fetch-backed client with trace-header propagation disabled. Browser `traceparent` headers can turn otherwise CORS-simple requests into preflighted requests against plain APIs and development proxies. The application root provides it beneath `HandlersLayer`; a test root provides `HttpTestLayer` beneath the same handlers.

## Services in Flags

The Flags Effect can require services too. `Runtime.run` resolves Flags before calling init, so an application Layer that supplies a Flags dependency must build during startup.

::Snippet{name="resourcesFlags" label="Flags consuming a resource"}

If the service Layer fails to build, startup cannot reach init or the first render. There is no Model for a crash view yet. A service used only by one Flags Effect may be private to that Effect when the application should never select or share it. Shared services stay exposed from the root Layer with `Layer.provideMerge` so Flags and handlers receive the same instance.

`Application.make` carries requirements from init, update, Subscriptions, registered Mounts, and ManagedResources. `Runtime.run` requires those requirements to be supplied. A Flags Effect can use a service produced by `Application.provide`, as shown above.

## Providing Multiple Services

Use `Layer.mergeAll` to combine service Layers. A reusable feature's lowercase `layer` export combines its real handlers and may provide business services owned by that feature. Leave concrete HTTP, storage, RPC, and browser providers as requirements for the application root to choose. The root composes those providers once, then the entry imports and provides one root `layer`. The next snippet shows only that root composition. Its Command, Subscription, and ManagedResource modules export the handler Layers, while `environment.ts` exports the concrete provider Layers.

::Snippet{name="resourcesMultiple" label="Multiple shared services"}

The provider Layer and its handler Layers live for the application runtime. Resources acquired in their Scope release when the runtime stops. When a camera stream, `WebSocket`, or other handle should exist only while the Model is in a particular state, use [Managed Resources](/core/managed-resources) instead.
