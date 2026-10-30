# Layers

## Overview

An Effect Layer is a recipe for constructing services and managing their lifetime. A service is a value that provides a capability, such as an API client. Foldkit uses Layers for two things:

- Each Block's `make` returns a Layer. `ProfileLive` is the recipe for constructing Profile instances.
- Ordinary services, such as an API client or a key-value store, are Layers too.

A program receives one Layer that provides the root Block, every Block the root creates, and every service their constructors yield. The Layer's type lists what is still missing, so TypeScript rejects a program with a missing Block or service before it runs.

These values have different jobs:

| Value                  | What it represents                                               |
| ---------------------- | ---------------------------------------------------------------- |
| `LoadUser({ userId })` | One request for the Runtime to perform work                      |
| The `LoadUser` handler | The function under `commands` that performs each request         |
| `ApplicationLive`      | A recipe that constructs the Application, including its handlers |
| `ApplicationLayer`     | A recipe that constructs the API client those handlers use       |

## Provide a Block and Its Services {#provide-the-handler-and-its-services}

This application loads a user through an `ApiClient` service. The service owns the request and decoding. `ApplicationLayer` provides it on top of Foldkit's HTTP client:

::Snippet{name="layers" label="API client service"}

The Application's constructor yields `ApiClient`, and its `LoadUser` handler translates the result into a Message:

::Snippet{name="layersApplication" label="Application using the API client"}

Because the constructor yields `ApiClient`, `ApplicationLive` requires it. The entry provides `ApplicationLayer` to `ApplicationLive` and passes the result to the program:

::Snippet{name="layersEntry" label="Providing services and running the application"}

`Program.make` describes the program. `Runtime.run` builds the Layer and starts it.

## Construction and Execution

The Runtime builds the program's Layer once per start. That build constructs each service once, such as the `ApiClient` above, and prepares each Block's constructor. It does not construct any instance yet.

Each Block instance's constructor runs when the instance first appears in its parent's Model. `yield* ApiClient` in the constructor retrieves the service the Layer built. It does not build another client. Every instance and every Command shares the one client.

Command handlers run once per Command, with fresh args. Streams start when the instance starts, or when a `subscriptions` entry's dependencies change. Mount handlers run when their element appears.

### Choosing the Lifetime

Put a value in the scope that owns its start and stop:

| Lifetime              | Use it for                                 | Examples                                              |
| --------------------- | ------------------------------------------ | ----------------------------------------------------- |
| One Runtime start     | Services in the program's Layer            | RPC clients, repositories, analytics clients          |
| One Block instance    | Values the constructor creates or acquires | A connected socket, a camera stream, a chart instance |
| One Command execution | Work and values produced for one dispatch  | Current time, request args, one HTTP response         |
| One Stream scope      | A `stream` or `subscriptions` entry        | Route-scoped events, timer ticks                      |
| One mounted element   | Mount acquisition and cleanup              | Element observers, anchored overlays                  |

Do not move a value into a longer lifetime than it has. A current timestamp changes per Command. A Mount's `Element` exists only for that mounted node. A handle the constructor acquires with `Effect.acquireRelease` is released when its instance leaves the Model, so it belongs to the instance, not the Runtime.

Keep fallible work out of constructors. A constructor has no Message to report a failure through, so a load that can fail, or that the UI should show as pending, belongs in a `start` Command.

## Child Block Layers {#layer-naming-and-composition}

A parent that declares `new Counter(...)` requires `Counter`. Provide the child's Layer to the parent's Layer. When several Blocks share children, provide the children once beneath them:

::Snippet{name="layersDashboard" label="A Dashboard holding two composite children"}

::Snippet{name="layersBlockGraph" label="Providing a graph of Block Layers"}

Each `Layer.provide` satisfies what the previous step still requires. `DashboardLive` needs `LinkedCounters` and `BonusPanel`. Providing them leaves their own requirement, `Counter`, and providing `CounterLive` leaves only the services that `ApplicationLayer` supplies. A missing Layer is a type error at `Program.make` that names the missing Block or service.

A reusable Block whose children are an implementation detail can provide them inside its own Layer, so consumers provide only the Block they use:

- Define `DialogLive` as `Dialog.make(...).pipe(Layer.provide(AnimationLive))`.
- A parent that creates a Dialog provides `DialogLive` and never mentions Animation.

Name Block Layers with a `Live` suffix, such as `CounterLive` and `ApplicationLive`. Name the root's ordinary services `ApplicationLayer` in `services.ts`, and their test alternative `ApplicationTestLayer`.

## Services and Requirements {#handler-and-service-requirements}

A Block's Layer requires exactly the services its constructor yields. Update and view never see them.

Suppose the `LoadUser` handler also records successful loads through a `Telemetry` service. The constructor yields `Telemetry` beside `ApiClient`, and the handler calls both. `ApplicationLive` now requires `ApiClient | Telemetry`. Nothing else changes: update still returns `LoadUser({ userId })`, the class contract is the same, and stories that never run handlers keep compiling once their test Layer provides `Telemetry`.

The entry stops compiling until something provides `Telemetry`. That is the check: a service added to one handler deep in the tree becomes a requirement of the program, and TypeScript reports it at the entry.

## Testing Through Service Boundaries

A story or scene builds the Block's Layer the way the program does. Provide the services the constructor yields with `Effect.provide`:

::Snippet{name="layersTest" label="Testing with a test service Layer"}

Stories and scenes never run Command handlers, so the test service only needs to exist. To test what a handler does with a service, extract the handler's Effect into a function of that service and run it directly, as [Commands](/core/commands#testing-the-handler-through-its-services) shows.

Choose the lowest service boundary whose code the test needs to exercise. If `ApiClient` contains request construction, authentication, decoding, or retries, keep its real Layer and replace the HTTP client beneath it. Replacing `ApiClient` with `ApplicationTestLayer` narrows the test to code above that service.

To test a parent without a child's real implementation, provide a different Layer for the child class. [Block](/core/block#test-a-block) shows a stub child.

## Host Implementations for Reusable Features

A reusable feature can own a workflow while leaving one capability to the application that uses it. Declare that capability as a service, and yield it in the feature's constructor. The feature owns the Command, its args, and its result Messages. The host decides how the capability works.

For example, an Editor owns saving, but not where documents are stored:

::Snippet{name="commandHostContract" label="Editor yielding a DocumentStore"}

A standalone host provides a `DocumentStore` backed by browser storage:

::Snippet{name="commandHostImplementation" label="Host saving documents to browser storage"}

A publishing application could provide a `DocumentStore` that saves through its document API instead. Both hosts use the same Editor, and the Editor's Model and update need no storage-specific branches. A host that forgets `DocumentStore` does not compile.

To give one instance a different implementation, provide the service where the parent declares that instance: `yield* new Editor('draft').pipe(Effect.provideService(DocumentStore, draftStore))`. [Block](/core/block#services-and-instances) shows the pattern.

## State in Handlers

Handlers and services can own mutable execution bookkeeping. The Model owns the application state used by update and view. Pass per-dispatch inputs through Command args, and report results through Messages so update can change the Model.

For an asset editor, the Model records the requested thumbnail jobs and their results. A service can own the worker pool that performs those jobs. The workers' availability controls how the work executes; update decides which jobs to request.

| State                                         | Owner                                                                   |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| Worker availability and lease bookkeeping     | A service's resource pool                                               |
| Worker request IDs and response callbacks     | The worker client's protocol bookkeeping                                |
| Cached deterministic calculations             | A service, with cache keys covering every input that affects the result |
| Selected document and submitted form contents | The Model, passed to the Command through args                           |
| Pending thumbnail jobs and their results      | The Model, updated through result Messages                              |
| Whether the user may submit another message   | The Model and update                                                    |

An `isSending` Ref in a constructor that the `SendMessage` handler checks hides a submission rule from the Model. A story can observe two submissions each returning a Command while the running handler rejects one using state that update never sees. Represent the request state as Model variants such as `Idle` and `Sending`. Let update decide whether a submission returns a Command, and handle its success or failure Message to leave `Sending`.

Moving that flag into a service leaves the decision outside the Model just the same. Stateful clients can manage connections, protocol correlation, and resource availability; application workflow transitions belong in update. An ongoing external event source belongs in a [Subscription](/core/subscriptions), not a background task started by a constructor.

## Application and Private Provider Lifetimes

Put concrete HTTP, storage, RPC, and browser providers in `ApplicationLayer` by default. Production and tests then have one visible place to substitute them.

| Question                        | Provided in the program's Layer                     | Private `Effect.provide` inside a handler          |
| ------------------------------- | --------------------------------------------------- | -------------------------------------------------- |
| How often is the Layer built?   | Once when the program starts                        | Once per Command                                   |
| Do Blocks share an instance?    | Yes, when their constructors yield the same service | No. Each Command gets a fresh instance             |
| Where can a test substitute it? | Wherever the Block's Layer is built                 | Only inside a direct test of that handler's Effect |
| What if construction fails?     | Startup fails before the first render               | The Command handles the failure at its boundary    |

Use a private provider only when the operation deliberately owns that provider and the application should not select or share it.

When an application needs localStorage and sessionStorage at the same time, define distinct service tags such as `LocalStorage` and `SessionStorage`, and bind each to its platform `KeyValueStore` Layer in `ApplicationLayer`. The tags keep both identities visible.

Foldkit's `Http.layer` uses Effect's Fetch-backed client with trace-header propagation disabled. Browser `traceparent` headers can turn otherwise CORS-simple requests into preflighted requests against plain APIs and development proxies. The [Http guide](/core/http) covers customization.

## Services in Flags

The Flags Effect runs before the root is constructed, outside the program's Layer. Provide the services it needs on the Effect itself, such as `Runtime.run(program, { flags: flags.pipe(Effect.provide(ApplicationLayer)) })`. [Init & Flags](/core/init-and-flags#flags) shows the complete entry.

If the Flags Effect's services fail to build, startup cannot reach the first render. There is no Model for a crash view yet.
