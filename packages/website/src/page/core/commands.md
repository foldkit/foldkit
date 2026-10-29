# Commands

## One-Shot Effects as Data {#overview}

Have update return a Command when the Runtime should perform one-time work in response to a Message: make an HTTP request, wait before a reset, or focus a button. The Command describes the work as data. The Runtime performs it and dispatches its result as another Message. Update handles that Message to change the Model.

This separation keeps update pure. A click can return a request without sending it, and a test can inspect that request without contacting a server. The same update function handles the user's action and the eventual success or failure.

:::Info{label="A complete application"}
The [weather example](/example-apps/weather) connects form input, Command args, HTTP response decoding, failure Messages, handler Layers, and application entry wiring.
:::

## Anatomy of a Command

The counter's update function has only changed the count so far. Add a button that resets it after one second. Put this application code in `application.ts`:

### Definition Fields

`ApplicationDefinition.makeCommand` gives the work a name within the Application and declares its result contract. This example keeps the definition and its handler together:

::Snippet{name="counterCommands" label="Counter with a delayed reset"}

:::Info{label="Why function*?"}
`handler` accepts a JavaScript generator function. Foldkit applies `Effect.gen` internally to construct the function that executes the Command.

There are two phases:

- **Construction:** the generator runs once when the application Layer builds. It can use `yield*` to obtain stable services, then returns the invocation function.
- **Execution:** the returned function runs for each Command, receives its args, and performs the work. The one-second timer in this example starts here.

When construction has no setup work, the generator simply returns the invocation function without using `yield*`. Accepting the generator directly lets TypeScript infer the returned function's args from the Schemas in the same definition, including when the constructor obtains services.

Constructors prepare execution machinery. Application state and workflow decisions belong in the Model and update. [State in handlers](/core/layers#state-in-handlers) explains which state a handler can own.
:::

Three pieces connect the work to update:

- `ApplicationDefinition.makeCommand` names `WaitBeforeReset`, declares the Messages it can produce, and stores its handler constructor in `config.handler`. The returned handler waits one second, then produces `CompletedWaitBeforeReset`.
- `WaitBeforeReset.layer` is the Layer recipe for that handler.
- `WaitBeforeReset()` creates the Command value that update returns. Creating that value does not start the timer.

`ApplicationComposition.makeUpdate` infers the handler requirements from every update branch. It does not execute Commands or change the function's behavior.

This counter is genuinely compact: `application.ts` owns its Model, Message, `ApplicationDefinition`, graphless `ApplicationComposition`, `ApplicationBlock`, init, update, view, Command, and local handler recipe. `entry.ts` passes the Block to `Program.make`, supplies any remaining Services through `program.provide(layer)`, and starts the Runtime. A split root instead puts every responsibility in its named file and removes the emptied `application.ts`:

::Snippet{name="counterCommandsEntry" label="Starting the counter"}

When the user clicks **Reset after one second**, the loop is:

1. The view dispatches `ClickedResetAfterDelay`.
2. Update returns the unchanged Model and `WaitBeforeReset()`.
3. The Runtime runs the provided handler, which waits one second.
4. The Runtime dispatches `CompletedWaitBeforeReset`.
5. Update receives that Message and sets `count` to zero.

The Runtime builds the application's handler Layer once at startup. Later Command executions reuse its handler; each execution starts its own timer.

### Command and Result Names

Command names are verb-first imperatives such as `FetchWeather`, `FocusItems`, and `LockScroll`. Name the effect performed by the handler. Here, `WaitBeforeReset` waits; the later update branch resets the count. Result Messages use `Completed` for ordinary completion, or `Succeeded` and `Failed` when the distinction matters: `CompletedWaitBeforeReset`, `SucceededFetchWeather`, and `FailedFetchWeather`.

## Testing Update Decisions {#testable-by-design}

A Story can test this loop without starting the application or waiting for a timer. Dispatch the click, check the returned Command, supply its result, and inspect the next Model:

::Snippet{name="counterCommandsTest" label="Delayed reset in a Story"}

The Story starts at count 5, checks that update returns `WaitBeforeReset`, then supplies `CompletedWaitBeforeReset` and verifies the count is 0. It tests the application's decisions and state transitions. It does not execute the handler or verify the one-second delay.

Use `message` to dispatch Messages, `Command.resolve` to supply results, and `model` to assert on state. The [Testing](/testing) guide covers Story and Scene steps. [Testing the handler through its services](#testing-the-handler-through-its-services) below covers executing the real Effect.

## Commands with Args

Declare `args` for inputs that vary from one dispatch to the next. This excerpt uses the counter's Model and passes `delayMs` from a click Message to the Command:

::Snippet{name="commandWithArgs" label="Passing a delay to a Command"}

The view supplies the selected delay in `ClickedResetAfterDelay`. The `args` field contains a record of Schemas. `WaitBeforeReset({ delayMs })` accepts that typed record, and the handler receives it when the Runtime executes the Command. The Model stays unchanged until `CompletedWaitBeforeReset` arrives.

Args also appear beside the Command name in DevTools. Story and Scene tests can match a particular dispatch with `Command.expectExact`.

Use args for per-dispatch data: a zip code, an element id, or a duration. Shared services come from [Layers](/core/layers). A module constant can stay in lexical scope. A handle that exists only while the Model needs it belongs to a [ManagedResource](/core/managed-resources).

## HTTP Requests

Network work follows the same loop. This excerpt also uses the counter's Model. A view dispatches `ClickedFetchCount`, and update returns a request for the next count:

::Snippet{name="counterHttpCommand" label="Fetching and decoding a count"}

### Handling Request Results

The `FetchCount` handler captures the application's `HttpClient` when its Layer is built. `fetchCount` constructs the request, checks for a successful status, and decodes the JSON with Schema. It produces `SucceededFetchCount` with the decoded count. Update then puts that value in the Model.

`Effect.catch` converts request, status, and decoding failures into `FailedFetchCount`. A failed request becomes a fact for update to handle. This small counter keeps its current count on failure; an application can store an error state and render a retry button in that branch.

:::Info{label="Handle failures as Messages"}
A Command handler must convert its expected failures into declared result Messages. The Effect error channel then confirms that no typed failure escapes the handler. Success and failure both return through update.
:::

## Handler Layers

A Command value requires its named handler. The handler, in turn, requires the services used to perform the work. Update can return `FetchCount()` while application assembly supplies `FetchCount.layer` and its HTTP client.

The attached handler stays beside the Command definition. Its `.layer` makes the implementation available for assembly, and a feature collects its local recipes in `EffectsLayer`.

The two Layers serve different purposes:

| Layer             | What it supplies                                              |
| ----------------- | ------------------------------------------------------------- |
| `FetchCountLayer` | The application's request, decoding, and result Message logic |
| `Http.layer`      | The browser HTTP client used by that logic                    |

This tutorial names the individual provider `FetchCountLayer` because the direct execution test reuses it. In ordinary feature assembly, compose `FetchCount.layer` directly in the local `EffectsLayer`. For an execution test, keep that real handler and provide a deterministic HTTP client beneath it. The request and result handling then run as they do in the application.

### Providing the HTTP Client

Define the HTTP provider in root `services.ts`:

::Snippet{name="commandHttpServices" label="Application HTTP provider"}

The entry imports that provider:

::Snippet{name="commandHttpLayer" label="Providing the HTTP service"}

The graphless root passes `FetchCountLayer` to `ApplicationComposition.prepareBlock` as its local `EffectsLayer`. Its remaining `HttpClient` requirement is supplied by `ApplicationLayer` from `services.ts`. `program.provide(ApplicationLayer)` satisfies that ordinary Service requirement, and `Runtime.run` requires a runnable Program.

`Http.layer` is Foldkit's Fetch-backed client. The [Http guide](/core/http) explains its browser tracing defaults and customization. Keep the concrete provider at the root so the application and execution tests can select it, and so Commands share the same client.

### Constructing the Handler {#implementing-the-handler}

`config.handler` is a generator constructor that captures dependencies when the application Layer is built, then returns the function that performs each invocation:

::Snippet{name="commandHandlerConstructor" label="Capturing a client during handler construction"}

The constructor runs once at application startup and returns a function. That function calls the same `fetchCount` operation on every invocation. The HTTP request happens when the returned function runs, not while the Layer is being built.

This constructor shape gives Commands, Subscriptions, Mounts, and ManagedResources one dependency injection boundary. Services are selected once at application assembly, while each Command invocation still receives its own args and performs fresh work. Looking up a service in the constructor retrieves the instance supplied by the application Layer; it does not construct that service again.

An update that returns `FetchCount()` requires the `FetchCount` handler. Adding another service to its implementation changes `FetchCount.layer`'s requirements at assembly without changing update's handler requirement. [Handler and service requirements](/core/layers#handler-and-service-requirements) compares how this dependency change flows through inline Effects and handler Layers.

When a handler has no dependencies or setup, return it directly from `function* () { return handler }`.

An existing Effect can keep its service requirements open. Return it from the invocation function; the handler Layer includes those requirements at assembly and supplies its captured Context when the Command runs. There is no need to yield services solely to provide the same instances back to that Effect. Invocation-specific services take precedence for contextual lookups.

Omit `handler` when the definition is a contract whose implementation belongs to an external host. That definition has no `.layer`. The host calls `toLayer` with its implementation Effect at its assembly boundary. [Host implementations for reusable features](/core/layers#host-implementations-for-reusable-features) shows an editor declaring a save operation that its host implements. It also accepts an alternative handler when a focused test deliberately replaces the entire handler. Most execution tests keep `.layer` and replace the HTTP, storage, RPC, clock, or browser service beneath it.

Keep changing values inside the invocation. Command args, the current time, and an active ManagedResource handle belong to the operation that uses them. Capturing a value in the constructor gives it application lifetime. [Layers](/core/layers) explains acquisition and provider lifetimes in depth.

A handler can own execution bookkeeping, such as a resource pool or worker response callbacks. Keep user-visible pending work, selections, and submission rules in the Model. [State in handlers](/core/layers#state-in-handlers) covers state ownership and scoped preparation.

#### Generic Feature Factories

A factory may accept a generic `Context.Key<Id, Service>` and preserve that exact Service requirement. Keep the Command unhandled in the reusable factory, return the key with the Command and composition parts, and attach the implementation after the caller selects a concrete key:

::Snippet{name="commandGenericFactoryLayer" label="Implementing a generic feature Command"}

Here, `searchFactory.ts` owns the generic Model, Message, unhandled `FetchResults` Command, and composition parts. The caller owns `SearchApi`, so it also owns the `toLayer` boundary. The resulting `EffectsLayer` retains `SearchApi` as an exact requirement for application assembly and tests.

An attached generator inside an unconstrained generic factory cannot provide the same construction proof. In the current Effect generator encoding, yielding `Context.Key<Id, Service>` contributes `Id` as the Effect requirement. Until `Id` is concrete, Foldkit cannot establish that it excludes Command, Subscription, Mount, or ManagedResource capabilities, which are unavailable during handler construction. Moving `toLayer` to the concrete caller supplies that proof without erasing the Service requirement.

#### Command Declaration Errors

A `No overload matches this call` error can point at valid `args` or `handler` fields as `never`. TypeScript may describe the final failed overload rather than the declaration's intended form. This does not mean that Commands cannot take arguments or attached handlers.

Check that every result Message returned by the handler appears in `messages`, that its args match the declared Schema fields, and that invocation failures become declared result Messages. For a generic Service identifier rejected during handler construction, use the concrete caller-owned Layer boundary above. Keep these checks at compile time; casts or erased Service requirements remove the guarantee.

### Naming and Composition

Compose `FetchCount.layer` directly in the feature's local `EffectsLayer`. Create a standalone `FetchCountLayer` binding only when that provider is intentionally public or independently reused, as it is by this tutorial's direct execution test.

Pass the local bundle to `FeatureComposition.prepareBlock`. Registered child Bindings carry their own recipes automatically. At root, produce the assembly, complete `ApplicationBlock` with `Block.assemble`, create the Program in the entry, and supply ordinary Services through `program.provide(ApplicationLayer)`. A simple root bundle can stay with its Command definitions in `command.ts`; extract `layer.ts` for substantial or reused composition. The [Project Organization](/patterns/project-organization#composing-handler-layers) guide covers compact and split layouts.

Command names are local to their named Block. Two features can both declare `FetchCount`; their owners keep the definitions distinct. Names must be unique within one owner, and composition derives readable paths for each Binding placement. A Command's handler requirement includes that owned name, its decoded args, and its declared result Messages. `FeatureComposition.prepareBlock` checks that the feature's `EffectsLayer` supplies each local requirement or that the definition appears in `hostHandlers`.

Derive an explicit handler requirement from its owning definition. `Command.HandlerOf` keeps the annotation aligned with the definition's args Schema and declared result Messages:

::Snippet{name="handlerRequirementAnnotation" label="Deriving a Command handler requirement"}

`FeatureComposition.makeUpdate` normally infers the requirement, so most application code needs no annotation. The explicit expanded form is `Command.Handler<Name, Args, DeclaredMessage>`.

Definitions created by different named Blocks receive different owned names even when their local names and protocols match. Each definition also retains a private runtime identity. Build an external implementation or test alternative with the original definition's `toLayer` so it keeps that identity.

### Testing the Handler Through Its Services

To test the actual request and decoding logic, execute `FetchCount` with its production handler and a supplied HTTP client:

::Snippet{name="commandHandlerTest" label="Executing the real handler with a test client"}

This test runs `FetchCountLayer`, including the request, status check, Schema decoder, and result Message mapping. The supplied client returns a known response without making a network request. Additional cases can supply a failed response or invalid JSON to exercise the real failure conversion.

Choose the service boundary according to the code the test should cover. If an API service contains authentication, retries, or other application policy, keep that service and replace its lower HTTP transport. Replacing the API service would leave its policy outside the test.

A handler stub can be useful for a narrower orchestration test that needs a particular result immediately. That test covers the application's response to the supplied result. The Story above makes this scope explicit by supplying a result without running a handler.

## Interrupting Commands

Commands normally run to completion. Make a Command interruptible when a user needs to cancel it or new input supersedes the work.

:::Info{label="Choosing a lifetime"}
Use Command interruption for one-time work such as a pending request, file read, or upload. When the Model controls the lifetime of ongoing work, use a [Subscription](/core/subscriptions) or [ManagedResource](/core/managed-resources). Work tied to a particular DOM element's lifetime belongs in [Mount](/core/mount).
:::

### Cancelling a Pending Command

Add `interrupt: true` to the timer definition to give it an `Interrupt` constructor. A Cancel button can return that cancellation Command:

::Snippet{name="commandInterruptible" label="Cancelling a pending reset"}

`WaitBeforeReset.Interrupt` creates data just like `WaitBeforeReset()`. The Runtime performs the cancellation and dispatches the Message produced by its `toMessage` function. An interrupted timer does not dispatch `CompletedWaitBeforeReset`, so it does not reset the count.

With `interrupt: true`, the Command name is the interruption key. Use this form when invocations do not need independent cancellation. A Command without declared args has no values from which to derive a key, so this is its only interruption form.

### Choosing an Interruption Key

Use `interrupt: { keyFields, toKey }` when concurrent invocations need separate Cancel buttons. Key the work by the Model identity a user can cancel. For example, an upload row uses `uploadId`, while a document editor might use `documentId`.

::Snippet{name="commandInterruptKey" label="Cancelling uploads independently"}

`keyFields` selects the args used to derive the interruption key. It also controls the args accepted by `UploadFile.Interrupt`: the cancellation site needs `{ uploadId }`, not the original `file`.

`toKey` receives only those selected own fields on both invocation and interruption. The handler still receives the full decoded args. The selected record has no prototype, so use `Object` helpers rather than inherited methods.

Inline literal tuples preserve exact selected fields. For an extracted policy, preserve the selected key in its annotation, such as `Command.InterruptOption<Args, 'uploadId'>`. A broad key union cannot guarantee that every possible field is present; its callback must handle uncertain fields as optional. Narrow a union of differently keyed policies before constructing the Command.

Do not key an upload by its file name. Two rows may upload the same file and still need independent cancellation.

Foldkit prefixes every derived key with the owned Command name, and composition adds the Binding placement. Local names must already be unique within their named Block, and separate static placements do not collide. Items in one keyed Binding share a placement, so include the item's stable identity in the key when those items need independent cancellation. A single-instance Block needs no extra field.

### Dispatching an Interrupt

With `interrupt: true`, pass the function that turns the outcome into a Message. With an args-derived key, pass the key args first. These cancellation Commands use the timer and upload definitions above:

::Snippet{name="commandInterruptConstructor" label="Creating cancellation Commands"}

The outcome is `Interrupted` when at least one invocation stopped. A stopped invocation's normal result Message will not dispatch, so update handles its cancellation result instead. `NotFound` means no invocation held the key; the work had already finished or never started.

Several invocations can hold one key. Dispatching more work does not cancel anything. An Interrupt stops every invocation currently registered at that address.

### Sequencing Replacement Work

Wait for cancellation to finish before starting the replacement. Commands returned together run concurrently, so `[FetchSuggestions.Interrupt(...), FetchSuggestions(...)]` races the old request against the new one.

The next update belongs to a search feature. Its Model holds the query, suggestions, a generation counter, and `searchState`. Its `FetchSuggestions` Command uses `interrupt: true`, accepts `query` and `generation`, and includes that generation in success and failure Messages.

::Snippet{name="commandInterruptReplacement" label="Sequencing replacement requests"}

The first `UpdatedQuery` received while a request runs increments `generation`, enters `Cancelling`, and returns one Interrupt. Incrementing the generation makes the old request's result stale before cancellation begins. More query changes replace `model.query` without dispatching another Interrupt. When cancellation completes, update reads the latest query and returns one replacement with the current generation.

#### Rejecting Stale Results

The result Message does not carry the outcome because `Interrupted` and `NotFound` mean the same thing here: the key is free. Each request carries its generation so a result that finished just before `NotFound` cannot overwrite newer suggestions, even when the user returns to the same query.

### Recording Why Cancellation Happened

Use a different result Message when cancellation records a different fact. Clicking Cancel and selecting a replacement file mean different things, even though both interrupt `UploadFile`:

::Snippet{name="commandInterruptCauses" label="Recording the cancellation cause"}

The Message records why cancellation completed; update chooses the follow-up. Data needed for that decision, such as `uploadId` or the newly selected file, belongs in the payload. Avoid adding a second behavior tag to one result Message.

#### Shared Cancellation Results

Use one result Message when the meaning is the same. A per-row Cancel button and Cancel all both record `CompletedCancelUploadFile`; they only differ in how many keys they interrupt.

#### Changing Intent During Cancellation

If the desired follow-up can change before the Interrupt completes, store that intent in the Model. For example, a `CancellingToStop | CancellingToReplace` union lets a later Message replace the intent. The cancellation result then reads the current variant instead of obeying a decision captured earlier.

The [interrupting-commands example](/example-apps/interrupting-commands) shows concurrent uploads keyed by upload id, per-upload cancellation, Cancel all, and restarting work under a freed key.
