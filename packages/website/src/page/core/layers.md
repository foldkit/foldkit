# Layers

## Overview

An Effect Layer is a recipe for constructing services and managing their lifetime. Foldkit uses Layers for shared application services and for handlers that implement Commands, Subscriptions, Mounts, and ManagedResources. The Runtime builds the application Layer once when the application starts and releases its scoped resources when the application stops.

:::Info{label="Think of it like a restaurant kitchen"}
Shared services are the kitchen equipment available all night. Every dish can use the same oven. A Model-driven handle, such as a camera stream, belongs to a [ManagedResource](/core/managed-resources) instead: it exists only while the Model needs it.
:::

`Application.make` defines the application and carries its unsatisfied Effect requirements. `Application.provide` adds the application Layer before `Runtime.run` starts the program. Command execution, Subscription restart, Mount insertion, and ManagedResource acquisition reuse the handlers and services that Layer built. A hydrating start validates the server handoff before acquiring the Layer.

A Command definition names the operation and its result Messages. Its `config.handler` is a generator constructor that captures any services the implementation needs, then returns the function that handles each invocation. Foldkit applies `Effect.gen` internally. The definition's `.layer` is the recipe application assembly provides. `Layer.provide` composes service Layers beneath that handler Layer. Subscriptions, Mounts, and ManagedResources use the same constructor boundary.

::Snippet{name="layers" label="Shared API client service"}

The application requires the `LoadUser` handler service. Both compositions include the real handler through `EffectsLayer = LoadUser.layer`. `AppLayer` supplies `ApiLayer`; `AppTestLayer` supplies `ApiTestLayer`. The API client starts once with the application, rather than once per `LoadUser` execution. This substitution exercises the real `LoadUser` mapping and error policy. Code inside the replaced `ApiLayer` is outside that test path.

Setting `config.handler` creates the definition's `.layer` recipe through the same construction path and handler identity that `toLayer(constructor)` uses. It does not install the handler automatically. Include that recipe in the feature's `EffectsLayer` and provide the root `AppLayer` explicitly. Foldkit does not search for an attached handler or fall back to it when another implementation is missing.

The handler generator runs once when the Runtime builds the application Layer, including constructors for handlers that are never invoked. For a Command, the function it returns receives serializable args each time the Command runs. For a Subscription, the returned function receives the current Model dependencies each time Foldkit starts or restarts its Stream. Mount and ManagedResource handlers likewise receive their element or Model-scoped requirements when that lifecycle begins.

Use `function* ()` to capture services, then return the invocation function. Foldkit applies `Effect.gen` around the generator. When construction has no work to perform, return the handler directly from the generator. The consistent shape makes application dependencies visible in the Layer graph even for a small handler.

Do not capture current time, Command args, Subscription dependencies, a Mount's element, or an active ManagedResource handle. Those values belong to the shorter-lived operation or lifecycle that supplies them. Looking up a service in the constructor retrieves the instance built for the application; the lookup does not construct its provider again.

## Handler and Service Requirements

Handler Layers separate the operations that the update function requests from the services used to implement them. An update that returns `LoadUser({ userId })` requires the `LoadUser` handler. Its implementation requires `ApiClientService`.

Suppose the handler also records successful loads through a `Telemetry` service. The constructor now obtains both services, and the returned function calls them when the Command runs. `LoadUser.layer` requires both services. The emitted Command requires `Command.HandlerOf<typeof LoadUser>`, so update and the parent updates that lift its Commands carry the same handler requirement.

Compare that with a Command carrying the implementation Effect directly. Its Effect requires every service the implementation uses. Adding telemetry changes that requirement from `ApiClientService` to `ApiClientService | Telemetry`, which flows through update and its parent folds.

| Requirement carried by                  | Before adding telemetry | After adding telemetry          |
| --------------------------------------- | ----------------------- | ------------------------------- |
| A Command with an inline implementation | `ApiClientService`      | `ApiClientService \| Telemetry` |
| A Command produced by `LoadUser(...)`   | `LoadUser` handler      | `LoadUser` handler              |
| The handler provider `LoadUser.layer`   | `ApiClientService`      | `ApiClientService \| Telemetry` |

Application assembly must supply the new telemetry dependency before `Runtime.run` accepts the application. An incomplete provider composition carries `Telemetry` as an unsatisfied requirement until the root supplies it. If that requirement reaches `Runtime.run`, TypeScript rejects the application. The update and its parent folds require the `LoadUser` handler throughout.

Every handler requirement also carries the definition's complete invocation protocol. The public annotation forms are:

| Primitive       | Exact annotation                                            | Preferred derived annotation                               |
| --------------- | ----------------------------------------------------------- | ---------------------------------------------------------- |
| Command         | `Command.Handler<Name, Args, DeclaredMessage>`              | `Command.HandlerOf<typeof CommandDefinition>`              |
| Subscription    | `Subscription.Handler<Name, Dependencies, DeclaredMessage>` | `Subscription.HandlerOf<typeof subscriptions.entry>`       |
| Mount           | `Mount.Handler<Name, Input, DeclaredMessage>`               | `Mount.RequirementsOf<typeof MountDefinition>`             |
| ManagedResource | `ManagedResource.Handler<Name, Params, Value>`              | `ManagedResource.HandlerOf<typeof managedResources.entry>` |

The expanded types require every protocol argument. Use the derived annotation when a signature needs an explicit requirement. Definitions, update helpers, lifts, aggregates, and attached Layer recipes carry these requirements automatically.

`Application.provide` compares handler contracts by primitive and name across the application's remaining requirements, the Layer's outputs, and the Layer's own input requirements. It rejects incompatible contracts passed directly, combined in one `Layer.mergeAll` bundle, or introduced by later `Application.provide` calls. This check prevents two different protocols from occupying one Effect Context key before the Runtime starts.

Two separately created definitions with the same name and identical protocol remain structurally indistinguishable to TypeScript. Each definition retains a private runtime identity, and Foldkit checks that identity when a Command runs, a Subscription starts, a Mount executes, or a ManagedResource lifecycle begins. Create alternate implementations through the original definition's `toLayer` so they keep its identity. Foldkit creates the handler service and its runtime identity from the definition.

An inline Effect can also carry typed dependencies and use replaceable services. Defining a separate operation service yourself can achieve the same separation. Foldkit generates that service boundary from each definition and uses it across Commands, Subscriptions, Mounts, and ManagedResources. The cost is explicit handler Layer composition, even for a small implementation.

## Testing Through Service Boundaries

Whole-application execution tests retain the real Command, Subscription, Mount, and ManagedResource handlers. Replace the dependency Layers beneath those handlers before the Runtime builds the application Layer: an API client, storage service, RPC transport, clock, or browser capability. This exercises the application's real effect translation and lifecycle behavior while making the external environment deterministic.

Choose the lowest service boundary whose code the test needs to exercise. If `ApiLayer` contains request construction, authentication, decoding, retries, or other business behavior, keep `ApiLayer` and replace its lower HTTP or RPC transport. Replacing `ApiLayer` with `ApiTestLayer` deliberately narrows the test to code above that service.

For a Subscription, the test service supplies the upstream events while the real handler still builds the Stream and Foldkit still starts, restarts, and stops it from Model dependencies. For a Mount, the test capability sits beneath the real element-scoped handler. For a ManagedResource, the test capability sits beneath the real acquire and release handler, so the Model-driven handle scope remains under test.

A handler stub can drive a result path directly, but it does not test the handler that was replaced. Ordinary execution tests need no new testing DSL: compose the production `.layer` recipes with test Layers for the external services, then execute the application or operation through Effect.

## Host Implementations for Reusable Features

A reusable feature can define an operation and require the application using it to supply the implementation. The feature owns the Command's args and result Messages. Its update returns that Command, and the host decides how to perform the operation.

For example, an editor feature can declare `SaveDocument` without choosing where documents are stored:

::Snippet{name="commandHostContract" label="Editor declaring its save operation"}

The editor's update returns `SaveDocument({ contents })` when the user requests a save and handles `SucceededSaveDocument` or `FailedSaveDocument` when it finishes. Omitting `handler` gives the definition no `.layer`. The editor requires `Command.HandlerOf<typeof SaveDocument>`, which its parent carries to application assembly.

A standalone host can implement this contract using browser storage:

::Snippet{name="commandHostImplementation" label="Host saving a document to browser storage"}

The host constructs a handler with `SaveDocument.toLayer` and provides its storage service beneath it. Include this handler alongside the feature's other handlers in the root `EffectsLayer`. Provide the assembled `AppLayer` before starting the application with `Runtime.run` or `Runtime.embed`. Without a provider for `SaveDocument`, the application retains that requirement and TypeScript rejects the start.

The same editor could be used inside a publishing application whose host saves through its document API. Both hosts use the editor's Command definition and report its declared result Messages, so the editor's Model and update need no storage-specific branches.

Use a host implementation when the operation's behavior belongs to the host. If the feature owns the save workflow and its result mapping, attach its constructor and let the host provide the storage or API service beneath that handler. Ordinary execution tests retain whichever handler the application uses and substitute its underlying services.

## State in Handlers

Handlers and services can own mutable execution bookkeeping. The Model owns the application state used by update and view. Pass per-dispatch inputs through Command args, and report results through Messages so update can change the Model.

For an asset editor, the Model records the requested thumbnail jobs and their results. A handler can own the worker pool that performs those jobs. The workers' availability controls how the work executes; update decides which jobs to request.

| State                                         | Owner                                                                              |
| --------------------------------------------- | ---------------------------------------------------------------------------------- |
| Worker availability and lease bookkeeping     | A handler's resource pool, or a shared service                                     |
| Worker request IDs and response callbacks     | The worker client's protocol bookkeeping                                           |
| Cached deterministic calculations             | A handler or service, with cache keys covering every input that affects the result |
| Selected document and submitted form contents | The Model, passed to the Command through args                                      |
| Pending thumbnail jobs and their results      | The Model, updated through result Messages                                         |
| Whether the user may submit another message   | The Model and update                                                               |

An `isSending` Ref in a handler that rejects another `SendMessage` invocation hides a submission rule from the Model. A Story can observe two submissions each returning a Command while the running handler rejects one using state that update never sees. Represent the request state as Model variants such as `Idle` and `Sending`. Let update decide whether a submission returns a Command, and handle its success or failure Message to leave `Sending`.

Moving that flag into a service leaves the application decision outside the Model. Stateful clients can manage connections, protocol correlation, and resource availability; application workflow transitions belong in update. An ongoing external event source belongs in a [Subscription](/core/subscriptions), rather than a background constructor task that advances application state independently.

### Preparing Execution Resources

A constructor can create an operation-specific pool with `Pool.make` or acquire a private resource with `Effect.acquireRelease`. Those resources belong to the application Layer's Scope and release when the application stops. For pooled resources, register each item's cleanup in its acquisition Effect. Put a pool used by several handlers in a shared service. Keep concrete platform providers selectable at root; a handler can obtain a resource factory service there and prepare its own machinery.

Constructors run during application startup even when their handlers are never invoked. Acquisition that fails in the constructor fails startup before a Model exists. When loading, failure, or retry needs to appear in the UI, perform that work in a Command invocation or a [ManagedResource](/core/managed-resources) and report the outcome through Messages. Resources that exist only while a Model condition holds belong in a ManagedResource; work tied to a live element belongs in a [Mount](/core/mount).

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

::Snippet{name="layersPerCommandHttp" label="HTTP provider at the application root"}

Foldkit’s `Http.layer` uses Effect’s Fetch-backed client with trace-header propagation disabled. Browser `traceparent` headers can turn otherwise CORS-simple requests into preflighted requests against plain APIs and development proxies. The application root provides it beneath the handler Layer; a test root can provide `HttpTestLayer` beneath the same handler.

## Services in Flags

Flags remain startup Effects rather than handler definitions. The Flags Effect can require services too. `Runtime.run` resolves Flags before calling init, so an application Layer that supplies a Flags dependency must build during startup.

::Snippet{name="layersFlags" label="Flags consuming a service"}

If the service Layer fails to build, startup cannot reach init or the first render. There is no Model for a crash view yet. A service used only by one Flags Effect may be private to that Effect when the application should never select or share it. Shared services stay exposed from the root Layer with `Layer.provideMerge` so Flags and handlers receive the same instance.

`Application.make` carries requirements from init, update, Subscriptions, registered Mounts, and ManagedResources. `Runtime.run` requires those requirements to be supplied. A Flags Effect can use a service produced by `Application.provide`, as shown above.

## Layer Naming and Composition

Import Effect's `Layer` module as `Layer`. A feature's `layer.ts` imports its definitions and composes attached recipes such as `LoadUser.layer` directly in `EffectsLayer`. Create a standalone `LoadUserLayer` binding only when that individual provider is intentionally public or independently reused outside `EffectsLayer` assembly, and name an external alternate `LoadUserTestLayer`. Access the combined bundle through the feature namespace as `Search.EffectsLayer`.

Each Submodel includes its own Commands, Subscriptions, Mounts, and ManagedResources in that bundle. Its parent merges the child `EffectsLayer` with its own handler Layers. Repeating this at each Submodel boundary produces one root `EffectsLayer` without making the entry point import every leaf implementation.

At the root, `EffectsLayer` combines the real handler Layers and top-level feature bundles. `ServicesLayer` combines concrete HTTP, storage, RPC, and browser providers. `AppLayer` supplies `ServicesLayer` to `EffectsLayer`. An `AppTestLayer` can supply alternate service providers to the same `EffectsLayer`.

Use `Layer.mergeAll` to combine Layers. A feature may provide a business service it owns beneath its `EffectsLayer`. Leave concrete environment providers as requirements for the root to choose. The entry imports and provides only `AppLayer`.

::Snippet{name="layersMultiple" label="Multiple shared services"}

The provider Layer and its handler Layers live for the application runtime. Resources acquired in their Scope release when the runtime stops. When a camera stream, `WebSocket`, or other handle should exist only while the Model is in a particular state, use [Managed Resources](/core/managed-resources) instead.

## UI Effects and Mount Registrations

Compose the `EffectsLayer` exports of the UI components a Submodel uses, such as `Dialog.EffectsLayer` and `Menu.EffectsLayer`. Collect their `mounts` exports in the Submodel's registration bundle. Each parent merges those bundles with its own until they reach the application root. Explicit composition includes the implementations the Submodel uses and keeps unrelated handlers out of its application Layer.

Some component factories own instance-specific effects. `Slider.forRoot(name, getTrackRoot)` returns that instance's `subscriptions` and `EffectsLayer`. `Toast.make(name, payloadSchema)` returns its typed component module with the same two exports. Compose them at the Submodel boundary that owns the factory instance.

Mount registration gives the view builder its allowed Mount contracts and adds their handler requirements to the application. TypeScript rejects an unregistered Mount or an embedded child view whose Mount requirements are missing. Reusable views preserve those requirements with `HtmlBuilder<Message, Mount.RequirementsOf<typeof mounts>>` or the fourth parameter of `Submodel.defineView`. Providing the handler Layer satisfies execution; registration declares which definitions the view may render. Registration starts no element work until the Mount appears in the view. Its included handler Layer builds at application startup. See [Mount requirements in reusable views](/core/mount#mount-requirements-in-reusable-views) for attribute and child-view composition.
