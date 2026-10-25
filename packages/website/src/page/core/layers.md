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

The completed Block carries the local handler recipe. The entry provides its remaining services and starts the Runtime:

::Snippet{name="layersEntry" label="Provide Services and run the application"}

When the Command belongs to a child Block, pass its local `EffectsLayer` to `FeatureComposition.prepareBlock` instead. Registering its Binding carries the checked handler graph upward. The root still supplies shared services once. The [Block guide](/core/block) shows that complete feature-to-root wiring.

Defining handlers, binding features, completing the Application, and calling `provide` all describe configuration. `Runtime.run` builds the Layers and starts execution. Attaching `handler` makes `.layer` available; the completed graph still needs to include that recipe.

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

## Host Implementations for Reusable Features

A reusable feature can define an operation and require the application using it to supply the implementation. The feature owns the Command's args and result Messages. Its update returns that Command, and the host decides how to perform the operation.

For example, an editor feature can declare `SaveDocument` without choosing where documents are stored:

::Snippet{name="commandHostContract" label="Editor declaring its save operation"}

The editor's update returns `SaveDocument({ contents })` when the user requests a save and handles `SucceededSaveDocument` or `FailedSaveDocument` when it finishes. Omitting `handler` gives the definition no `.layer`. At completion, `hostHandlers: [SaveDocument]` explicitly delegates that missing implementation to the host. Without a local recipe or that declaration, `prepareBlock` rejects the incomplete feature.

A standalone host can implement this contract using browser storage:

::Snippet{name="commandHostImplementation" label="Host saving a document to browser storage"}

The host constructs `SaveDocumentLayer` from the original contract definition and calls `EditorBlock.provideHandlers(SaveDocumentLayer)` on the completed Block. Bind the resulting `editor` value in the parent. `ApplicationLayer` supplies the storage service beneath that handler. If the host leaves the handler unsupplied, its requirement reaches application assembly and TypeScript rejects running the application.

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

Define `ApplicationLayer` in root `services.ts`, then import it in the entry:

::Snippet{name="layersPerCommandHttpServices" label="Shared HTTP service provider"}

::Snippet{name="layersPerCommandHttp" label="HTTP provider at the application root"}

Foldkit’s `Http.layer` uses Effect’s Fetch-backed client with trace-header propagation disabled. Browser `traceparent` headers can turn otherwise CORS-simple requests into preflighted requests against plain APIs and development proxies. The application root provides it to the Application composition’s handler graph; a test root can provide `HttpTestLayer` to the same handlers.

## Services in Flags

Flags remain startup Effects rather than handler definitions. The Flags Effect can require services too. `Runtime.run` resolves Flags before calling init, so an application Layer that supplies a Flags dependency must build during startup.

The root `services.ts` defines the session client and combines its provider with `Http.layer`:

::Snippet{name="layersFlagsServices" label="Session service and application provider"}

The Flags Effect consumes the session client supplied by that Layer:

::Snippet{name="layersFlags" label="Flags consuming a service"}

The root Block collects the split implementation from each owner. The entry supplies the same Layer to the Program and Flags Effect:

::Snippet{name="layersFlagsEntry" label="Entry resolving Flags"}

If the service Layer fails to build, startup cannot reach init or the first render. There is no Model for a crash view yet. A service used only by one Flags Effect may be private to that Effect when the application should never select or share it. Shared services stay exposed from the root Layer with `Layer.provideMerge` so Flags and handlers receive the same instance.

`ApplicationComposition.prepareBlock` carries requirements from init, update, Subscriptions, composed Mounts, and ManagedResources. `Program.make` carries them into the Program, and `Runtime.run` requires them to be supplied. A Flags Effect can use a Service produced by a Layer passed to `program.provide(layer)`, as shown above.

A hydrating start validates the server handoff before acquiring the application Layer. [Init & Flags](/core/init-and-flags#server-rendering-and-hydration) covers server-supplied startup data.

## Layer Naming and Composition

Import Effect's module as `Layer`. Use these names to keep local implementations and shared dependencies recognizable:

| Name                   | Contains                                                      |
| ---------------------- | ------------------------------------------------------------- |
| `LoadUser.layer`       | One attached handler recipe                                   |
| `EffectsLayer`         | Handler recipes owned by the current feature                  |
| `ApplicationLayer`     | Root HTTP, storage, RPC, and other ordinary service providers |
| `ApplicationTestLayer` | Alternate root services for the same handler graph            |

Compose local recipes directly with `Layer.mergeAll`. Name an individual provider `LoadUserLayer` only when it is intentionally public or independently reused outside that assembly. Name an external test alternative `LoadUserTestLayer`.

Commands remain explicit because they have no closed owner registry: list each selected Command's `.layer` in the merge. An owned ManagedResource registry supplies `managedResources.layer` when every entry has an attached handler, matching `subscriptions.layer`. Empty registries supply `Layer.empty`. Both reserve the registry key `layer`. Mixed or host-owned registries require explicit entry providers; use individual entry Layers when selecting a subset:

::Snippet{name="applicationFeatureLayer" label="Combining local handler recipes"}

`Layer.mergeAll` and Block completion build passive recipes. The Runtime constructs the handlers when the Program starts. A ManagedResource acquires its handle when its Model condition becomes active; including its handler Layer does not acquire the handle.

A Block passes its local bundle to `FeatureComposition.prepareBlock({ EffectsLayer })`. Registering its Binding in the parent contributes the child's checked handler graph, including descendants. The parent supplies only its own local recipes. Do not merge a registered child's bundle again. This works for static, optional, and keyed Bindings, so the entry point never needs to import every leaf handler.

A feature can provide a business service it owns beneath its local `EffectsLayer`. Leave concrete environment providers open for the root to select. Those ordinary requirements flow through parents until `program.provide(ApplicationLayer)` satisfies them. `ServicesLayer` is a useful name for an intermediate service bundle when root composition needs one.

### Share Services Across Owners

Reuse one Command Definition across transitions owned by the same Block. The [state machine example](https://github.com/foldkit/foldkit/tree/main/examples/state-machine/src) defines `PlaceOrder` on `ApplicationDefinition`; the checkout Machine returns it from an Edge, and its result remains an Application Message handled by that same state machine.

When separate Blocks need the same HTTP, storage, or domain operation, share an Effect Service instead. Each Block defines its own Command and result Messages against that Service, then includes the Command's handler recipe in its own `EffectsLayer`. The root supplies the shared Service implementation once. This keeps each result in the Message union and update function that own the transition while reusing the external capability.

::Snippet{name="layersMultiple" label="Multiple shared services"}

Keep a small feature bundle in `block.ts`, or beside root Command definitions in `command.ts`. Extract `layer.ts` when composition is substantial or reused. Root `services.ts` exports `ApplicationLayer`; `block.ts` assembles `ApplicationBlock`, and `entry.ts` supplies the Layer to the Program. [Project Organization](/patterns/project-organization#composing-handler-layers) shows the complete compact and split layouts.

Select an alternative local recipe with `block.replaceEffectsLayer(recipe)` before binding. It preserves selected descendant recipes and stays passive until startup. Use the original definitions' `toLayer` methods to retain their contracts and identities. See [Selecting a local handler recipe](/core/block#select-a-local-handler-recipe).

There is no flattened handler inventory today. Inspect the registered children, completed Blocks, and their local `EffectsLayer` bundles; avoid maintaining a second global list.

## Explicit Handler Requirements

Most authored pieces infer their requirements. When a standalone signature needs an annotation, derive it from the definition so its args, dependencies, and result Messages stay aligned:

| Primitive       | Derived annotation                                            | Expanded form                                               |
| --------------- | ------------------------------------------------------------- | ----------------------------------------------------------- |
| Command         | `Command.HandlerOf<typeof LoadUser>`                          | `Command.Handler<Name, Args, DeclaredMessage>`              |
| Subscription    | `Subscription.HandlerOf<typeof subscriptions.gameClockTicks>` | `Subscription.Handler<Name, Dependencies, DeclaredMessage>` |
| Mount           | `Mount.RequirementsOf<typeof MountChart>`                     | `Mount.Handler<Name, Input, DeclaredMessage>`               |
| ManagedResource | `ManagedResource.HandlerOf<typeof managedResources.camera>`   | `ManagedResource.Handler<Name, Params, Value>`              |

The expanded forms require every protocol argument. Definitions, update helpers, Bindings, and handler recipes carry the same information without explicit annotations.

`FeatureComposition.prepareBlock` checks local requirements against `EffectsLayer` and definitions explicitly delegated through `hostHandlers`. Parent Bindings carry that checked graph. The Program's `provide` method supplies the root Block's remaining ordinary service requirements.

Owned definitions include the Block's name and local operation name. Each definition also retains a private runtime identity, checked when its handler runs. Create alternative implementations through that original definition's `toLayer` so the implementation retains the declared identity.

## UI Effects and Mount Registrations

Bind a completed UI Block and include that Binding in the parent's `bindings` list. Its handler recipes and Mount registrations then reach the parent together. This keeps the implementation graph aligned with the update and view placement.

View-only components need no Block. Stateful Foldkit UI components provide completed values such as `DialogBlock`. Generic factories such as `Combobox.create(ItemSchema)` return a completed Block; name that result `ItemComboboxBlock`. Bind each used placement, including keyed collections, and include those Bindings under `bindings`.

Component factories such as a Schema-refined Combobox return a completed Block with the factory's inferred Model, Message, OutMessage, view inputs, and public API operations. Bind the returned value exactly like a non-generic component.

Including Mounts in a Composition gives its view builder the allowed Mount contracts and adds their handler requirements to the application. TypeScript rejects a Mount outside that capability set or an embedded child view whose Mount requirements are missing. `FeatureComposition.makeView` derives this evidence from the local `mounts` and child Bindings. Providing the handler Layer satisfies execution; Composition declares which definitions the view may render. Composition starts no element work until the Mount appears in the view. Its included handler Layer builds at application startup. See [Mount requirements in reusable views](/core/mount#mount-requirements-in-reusable-views) for attribute and child-view composition.
