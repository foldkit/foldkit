# Layers

## Overview

An Effect Layer is a recipe for constructing services and managing their lifetime. A service is a value that provides a capability, such as an API client. Foldkit also uses Layers to construct the handlers that implement Commands, Subscriptions, Mounts, and ManagedResources.

Layers give application assembly a typed list of what it still needs. A feature can request `LoadUser` without passing an HTTP client through update and every parent. Assembly supplies its handler and the services used by that handler. TypeScript rejects an application with missing providers before the Runtime starts it.

These values have different jobs:

| Value                                           | What it represents                                       |
| ----------------------------------------------- | -------------------------------------------------------- |
| `LoadUser({ userId })`                          | One request for the Runtime to perform work              |
| The function returned by `LoadUser`'s `handler` | The implementation used for each request                 |
| `LoadUser.layer`                                | A recipe that constructs that handler                    |
| `ApiLayer`                                      | A recipe that constructs the API client the handler uses |

## Provide the Handler and Its Services

This root application loads a user through an API service. The Command owns the translation from an API result to a Message; the API service owns the request and decoding:

::Snippet{name="layers" label="Shared API client service"}

The application starts by requesting one user. Its update handles the Command's two result Messages, and its view displays the resulting state:

::Snippet{name="layersApplication" label="Application using the API handler"}

The construction Layer retains the local handler recipe. The entry selects that Layer with `ApplicationBlock`, provides remaining Services and starts the Runtime:

::Snippet{name="layersEntry" label="Provide Services and run the application"}

When the Command belongs to a child Block, pass its local `EffectsLayer` to `FeatureBlock.makeLayer` instead. The parent registers a Binding to that public contract and provides the child's construction Layer. Its acquired connection contributes the checked handler graph upward. The root still supplies shared Services once. The [Block guide](/core/block) shows that complete feature-to-root wiring.

Defining handlers, binding features, completing the Application, and calling `provide` all describe configuration. `Runtime.run` builds the Layers and starts execution. Attaching `handler` makes `.layer` available; the completed graph still needs to include that recipe.

For several local handlers, compose their recipes with Effect's `Layer.mergeAll` and pass the result as `EffectsLayer` to `FeatureBlock.makeLayer`:

::Snippet{name="blockLocalHandlerLayers" label="Combining local Command handlers"}

Use `subscriptions.layer` and `managedResources.layer` for a registry whose entries all have attached handlers. There is no aggregate Command registry; merge the individual Command definitions' `.layer` recipes. Registered child Bindings contribute their own handler Layers automatically.

Compose the concrete definitions' `.layer` values, whose types retain their Services and constructor errors, and let `FeatureBlock.makeLayer` infer the recipe. The selected implementation retains both local and acquired child handler Layers; the passive Block declaration does not expose a private `EffectsLayer`. Do not annotate the recipe as `unknown` or merge child `EffectsLayer` values again at the root.

`ApplicationTestLayer` supplies `ApiTestLayer` beneath the same real handler. The `LoadUser` result mapping and error policy still execute. The replaced API implementation is outside that test path; [Testing Through Service Boundaries](#testing-through-service-boundaries) explains how to choose what a test exercises.

## Construction and Execution

The `handler` field accepts a generator because constructing an implementation may require Effects. Foldkit applies `Effect.gen` around it. For a Command, Subscription, or Mount, the generator obtains stable dependencies and returns the function used for each invocation. A ManagedResource constructor returns an object with `acquire` and `release` functions instead. If construction needs no setup, the generator simply returns the function or object.

The Runtime builds the supplied application Layer once per start. Handler constructors run at that point, including constructors for handlers never invoked. Each Command then calls its constructed handler with fresh args. A Subscription starts its constructed Stream factory with current Model dependencies; a Mount receives its live element; a ManagedResource receives its current acquisition requirements.

Obtaining an API client with `yield* ApiClientService` retrieves the instance supplied by its Layer. It does not create another client. The API client and handler stay alive across Command executions and lifecycle restarts. The Runtime releases their scoped resources when the application stops.

If an existing Effect or Stream already declares its service requirements, return it from the invocation function. The handler Layer carries those requirements to application assembly and captures the supplied Context. Contextual lookups use the invocation Context over the construction Context. Yield a service when the returned function needs to call the captured object directly; yielding it solely to re-provide the same instance to an existing operation adds unnecessary plumbing.

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

An inline Effect can also carry typed dependencies and use replaceable services. Defining a separate operation service yourself can achieve the same separation. Foldkit generates that service boundary from each definition and uses it across Commands, Subscriptions, Mounts, and ManagedResources. The cost is explicit handler Layer composition, even for a small implementation.

Replacing a whole handler is useful when its behavior belongs to a host or when a focused test controls that boundary. Most application execution tests keep the handler and replace its underlying services. Typed assembly and separating implementation dependencies from update are useful even when the handler is never replaced.

## Testing Through Service Boundaries

Whole-application execution tests retain the real Command, Subscription, Mount, and ManagedResource handlers. Replace the dependency Layers beneath those handlers before the Runtime builds the application Layer: an API client, storage service, RPC transport, clock, or browser capability. This exercises the application's real effect translation and lifecycle behavior while making the external environment deterministic.

Choose the lowest service boundary whose code the test needs to exercise. If `ApiLayer` contains request construction, authentication, decoding, retries, or other business behavior, keep `ApiLayer` and replace its lower HTTP or RPC transport. Replacing `ApiLayer` with `ApiTestLayer` deliberately narrows the test to code above that service.

For a Subscription, the test service supplies the upstream events while the real handler still builds the Stream and Foldkit still starts, restarts, and stops it from Model dependencies. For a Mount, the test capability sits beneath the real element-scoped handler. For a ManagedResource, the test capability sits beneath the real acquire and release handler, so the Model-driven handle scope remains under test.

A handler stub can drive a result path directly, but it does not test the handler that was replaced. Ordinary execution tests need no new testing DSL: compose the production `.layer` recipes with test Layers for the external services, then execute the application or operation through Effect.

## Host implementations for reusable features

A reusable feature can own its save workflow while the application supplies storage. Define an ordinary `EditorStorage` Service for that capability and acquire it in the attached `SaveDocument` handler constructor. The feature owns the Command args, result Messages, and update transitions.

::Snippet{name="commandHostContract" label="Editor owning the save workflow"}

The host implements that Service with browser storage or a document API:

::Snippet{name="commandHostImplementation" label="Host providing editor storage"}

The implementation Layer retains the real Command handler. The host’s provider supplies the storage dependency. An execution test can replace the storage transport and still exercise request construction, error handling, and result mapping.

When the integrator owns a handler implementation, an ordinary Block constructor can list the original definition under `hostHandlers`. Select providers for every listed definition with `layer.pipe(FeatureBlock.provideHandlers(HandlersLayer))`, using their original `toLayer` methods. Provider Services and constructor errors must fit the Block's declared effects contract. This selection is passive; handler Layers are built later by the Runtime.

The passive public child contract does not expose the implementation's private handler inventory. Some generic family APIs, including Query, deliberately publish original host-handler contracts with their own checked `provideHandlers` selector. For normal storage or transport variation, keep the feature's workflow in its attached handler and provide the ordinary Service boundary shown above.

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

Define `ApplicationLayer` in root `services.ts`, then import it in the entry:

::Snippet{name="layersPerCommandHttpServices" label="Shared HTTP service provider"}

::Snippet{name="layersPerCommandHttp" label="HTTP provider at the application root"}

Foldkit’s `Http.layer` uses Effect’s Fetch-backed client with trace-header propagation disabled. Browser `traceparent` headers can turn otherwise CORS-simple requests into preflighted requests against plain APIs and development proxies. The application root provides it to the Application composition’s handler graph; a test root can provide `HttpTestLayer` to the same handlers.

## Services in Flags

Flags remain startup Effects rather than handler definitions. The Flags Effect can require Services while obtaining an already decoded value. `Runtime.run` resolves Flags before calling init, so an application Layer that supplies a Flags dependency must build during startup. A hydratable server handoff is different: its Flags Schema must encode and decode synchronously without Effect Services.

The root `services.ts` defines the session client and combines its provider with `Http.layer`:

::Snippet{name="layersFlagsServices" label="Session service and application provider"}

The Flags Effect consumes the session client supplied by that Layer:

::Snippet{name="layersFlags" label="Flags consuming a service"}

The root Block collects the split implementation from each owner. The entry supplies the same Layer to the Program and Flags Effect:

::Snippet{name="layersFlagsEntry" label="Entry resolving Flags"}

If the service Layer fails to build, startup cannot reach init or the first render. There is no Model for a crash view yet. A service used only by one Flags Effect may be private to that Effect when the application should never select or share it. Shared services stay exposed from the root Layer with `Layer.provideMerge` so Flags and handlers receive the same instance.

`ApplicationBlock.makeLayer` carries requirements from init, update, Subscriptions, composed Mounts, and ManagedResources. `Program.make` carries them into the Program, and `Runtime.run` requires them to be supplied. A Flags Effect can use a Service produced by a Layer passed to `program.provide(layer)`, as shown above.

A hydrating start validates the server handoff before acquiring the application Layer. [Init & Flags](/core/init-and-flags#server-rendering-and-hydration) covers server-supplied startup data.

## Layer Naming and Composition

Import Effect's module as `Layer`. Use these names to keep local implementations and shared dependencies recognizable:

| Name                   | Contains                                                      |
| ---------------------- | ------------------------------------------------------------- |
| `LoadUser.layer`       | One attached handler recipe                                   |
| `EffectsLayer`         | Handler recipes owned by the current feature                  |
| `layer`                | The feature's checked executable graph construction recipe    |
| `ApplicationLayer`     | Root HTTP, storage, RPC, and other ordinary service providers |
| `ApplicationTestLayer` | Alternate root services for the same handler graph            |

Compose local recipes directly with `Layer.mergeAll`. Name an individual provider `LoadUserLayer` only when it is intentionally public or independently reused outside that assembly. Name an external test alternative `LoadUserTestLayer`.

Commands remain explicit because they have no closed owner registry: list each selected Command's `.layer` in the merge. An owned ManagedResource registry supplies `managedResources.layer` when every entry has an attached handler, matching `subscriptions.layer`. Empty registries supply `Layer.empty`. Both reserve the registry key `layer`. Mixed or host-owned registries require explicit entry providers; use individual entry Layers when selecting a subset:

::Snippet{name="applicationFeatureLayer" label="Combining local handler recipes"}

`Layer.mergeAll` and Block completion build passive recipes. The Runtime constructs the handlers when the Program starts. A ManagedResource acquires its handle when its Model condition becomes active; including its handler Layer does not acquire the handle.

A Block passes its local bundle to `FeatureBlock.makeLayer`. Registering its Binding in the parent contributes the child's checked handler graph, including descendants. The parent supplies only its own local recipes. Do not merge a registered child's bundle again. This works for static, optional, and keyed Bindings, so the entry point never needs to import every leaf handler.

A feature can provide a business service it owns beneath its local `EffectsLayer`. Leave concrete environment providers open for the root to select. Those ordinary requirements flow through parents until `program.provide(ApplicationLayer)` satisfies them. `ServicesLayer` is a useful name for an intermediate service bundle when root composition needs one.

### Share Services Across Owners

Reuse one Command Definition across transitions owned by the same Block. The [state machine example](https://github.com/foldkit/foldkit/tree/main/examples/state-machine/src) defines `PlaceOrder` on `ApplicationBlock`; the checkout Machine returns it from an Edge, and its result remains an Application Message handled by that same state machine.

When separate Blocks need the same HTTP, storage, or domain operation, share an Effect Service instead. Each Block defines its own Command and result Messages against that Service, then includes the Command's handler recipe in its own `EffectsLayer`. The root supplies the shared Service implementation once. This keeps each result in the Message union and update function that own the transition while reusing the external capability.

::Snippet{name="layersMultiple" label="Multiple shared services"}

Keep a compact feature bundle with its complete implementation. A split feature uses `effectsLayer.ts` for a separate handler bundle. Root `services.ts` exports `ApplicationLayer`; `layer.ts` exports the construction `layer`, and `entry.ts` supplies the Layer to the Program. [Project Organization](/patterns/project-organization#composing-handler-layers) shows the complete compact and split layouts.

Choose an implementation through its Layer and provide controlled ordinary Services beneath its real handlers. APIs that deliberately publish host-handler contracts, such as Query, expose their checked provider selector. See [handler providers](/core/block#select-a-local-handler-recipe).

Keep handler declarations and their local `EffectsLayer` with the owning implementation. A public Block contract does not expose its private descendant inventory; avoid maintaining a second global list.

### Construction and runtime providers

A Block implementation Layer constructs its executable graph. Its `EffectsLayer` constructs handlers for Commands and lifecycle work. Keep ordinary request dependencies in those handler constructors. Provide child implementation Layers with ordinary `.pipe(Layer.provide(...))`.

A Program’s `provide(layer)` supplies runtime providers. If a host Service is also needed while constructing the graph, use `provide({ services: ServicesLayer, runtime: RuntimeLayer })`. The shared `services` build before graph construction and remain available to handlers and Flags. The optional `runtime` providers build after ManagedResource handles exist. Both remain under the host Scope; runtime-only outputs cannot satisfy an earlier construction requirement.

Declaring any of these Layers is passive. Constructing the graph does not initialize Models or start Model-driven occurrence lifecycles.

## Explicit Handler Requirements

Most authored pieces infer their requirements. When a standalone signature needs an annotation, derive it from the definition so its args, dependencies, and result Messages stay aligned:

| Primitive       | Derived annotation                                            | Expanded form                                               |
| --------------- | ------------------------------------------------------------- | ----------------------------------------------------------- |
| Command         | `Command.HandlerOf<typeof LoadUser>`                          | `Command.Handler<Name, Args, DeclaredMessage>`              |
| Subscription    | `Subscription.HandlerOf<typeof subscriptions.gameClockTicks>` | `Subscription.Handler<Name, Dependencies, DeclaredMessage>` |
| Mount           | `Mount.RequirementsOf<typeof MountChart>`                     | `Mount.Handler<Name, Input, DeclaredMessage>`               |
| ManagedResource | `ManagedResource.HandlerOf<typeof managedResources.camera>`   | `ManagedResource.Handler<Name, Params, Value>`              |

The expanded forms require every protocol argument. Definitions, update helpers, Bindings, and handler recipes carry the same information without explicit annotations.

`FeatureBlock.makeLayer` checks local handler coverage against `EffectsLayer` and any explicitly declared `hostHandlers`. It checks remaining Services and errors against the declared effect contract. Select pending host handlers on the construction Layer before hosting the Block. Parent Bindings carry the selected implementation's checked graph. The Program's `provide` method supplies the root Block's remaining ordinary Service requirements.

Owned definitions include the Block's name and local operation name. Each definition also retains a private runtime identity, checked when its handler runs. Create alternative implementations through that original definition's `toLayer` so the implementation retains the declared identity.

## UI Effects and Mount Registrations

Bind the public UI Block contract and include that Binding in the parent's `bindings` list. Provide the component's implementation Layer to the parent's construction Layer. The acquired child contributes its handler recipes and Mount registrations together, keeping the implementation graph aligned with update and view placement.

View-only components need no Block. Stateful Foldkit UI components export public declarations such as `DialogBlock` and implementation providers such as `Dialog.layer`. Generic factories such as `Combobox.makeBlock(ItemSchema)` return a passive public Block; name that result `ItemComboboxBlock` and supply `Combobox.layer`. Bind each used placement, including keyed collections, and include those Bindings under `bindings`.

A Schema-refined Combobox contract retains the factory's inferred Model, Message, OutMessage, view inputs and Binding operations. Bind the returned declaration exactly like a non-generic component; callable init, update and view functions belong to the acquired executable.

Including Mounts in a Composition gives its view builder the allowed Mount contracts and adds their handler requirements to the application. TypeScript rejects a Mount outside that capability set or an embedded child view whose Mount requirements are missing. `FeatureComposition.makeView` derives this evidence from the local `mounts` and child Bindings. Providing the handler Layer satisfies execution; Composition declares which definitions the view may render. Composition starts no element work until the Mount appears in the view. Its included handler Layer builds at application startup. See [Mount requirements in reusable views](/core/mount#mount-requirements-in-reusable-views) for attribute and child-view composition.

## Public bounds and construction dependencies

A Block's `effects.services`, `effects.managedResources` and `effects.Error` bound its handler-Layer Services, ManagedResource handles and construction failures. The Effect passed to `makeLayer` has its own inferred requirements and errors. Ordinary request Services remain in their handler constructors, and invocation failures become Messages.

The implementation's `EffectsLayer` selects local handler recipes. A separate bundle lives in `effectsLayer.ts`; `layer.ts` constructs the Block and provides child implementation Layers. `Block.makeEffectsContract<E, R>()` supplies generic handler-Layer error and ordinary Service bounds without repeating a finite Schema list.

[Serializable Model and Message Codecs](/core/block#serializable-model-and-message-codecs) must complete synchronously without Effect Services. The check includes generated child delivery envelopes, so a Service-dependent child Message rejects the complete parent graph too. Keep ordinary Services in handlers and other effectful boundaries instead of moving them into a Block Codec.
