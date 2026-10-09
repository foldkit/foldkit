# Commands

## Overview

Have update return a Command when the Runtime should perform one-time work in response to a Message: make an HTTP request, wait before a reset, or focus a button. The Command describes the work as data. The Runtime performs it and dispatches its result as another Message. Update handles that Message to change the Model.

This separation keeps update pure. A click can return a request without sending it, and a test can inspect that request without contacting a server. The same update function handles the user's action and the eventual success or failure.

:::Info{label="A complete application"}
The [weather example](/example-apps/weather) connects form input, Command args, HTTP response decoding, failure Messages, handler Layers, and application entry wiring.
:::

## Anatomy of a Command

The counter's update function has only changed the count so far. Add a button that resets it after one second. Put this application code in `main.ts`:

::Snippet{name="counterCommands" label="Counter with a delayed reset"}

Three pieces connect the work to update:

- `Command.define` names `WaitBeforeReset` and declares the Messages it can produce.
- `WaitBeforeResetLayer` supplies the handler: wait one second, then produce `CompletedWaitBeforeReset`.
- `WaitBeforeReset()` creates the Command value that update returns. Creating that value does not start the timer.

`Update.make` infers the handler requirements from every update branch. It does not execute Commands or change the function's behavior.

The entry point supplies the handler Layer and starts the application:

::Snippet{name="counterCommandsEntry" label="Providing the counter's handler"}

When the user clicks **Reset after one second**, the loop is:

1. The view dispatches `ClickedResetAfterDelay`.
2. Update returns the unchanged Model and `WaitBeforeReset()`.
3. The Runtime runs the provided handler, which waits one second.
4. The Runtime dispatches `CompletedWaitBeforeReset`.
5. Update receives that Message and sets `count` to zero.

The Runtime builds the Layer once when the application starts. Later Command executions reuse its handler; each execution starts its own timer.

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

`FetchCountLayer` looks up the application's `HttpClient` when the handler runs. `fetchCount` constructs the request, checks for a successful status, and decodes the JSON with Schema. It produces `SucceededFetchCount` with the decoded count. Update then puts that value in the Model.

`Effect.catch` converts request, status, and decoding failures into `FailedFetchCount`. A failed request becomes a fact for update to handle. This small counter keeps its current count on failure; an application can store an error state and render a retry button in that branch.

:::Info{label="Handle failures as Messages"}
A Command handler must convert its expected failures into declared result Messages. The Effect error channel then confirms that no typed failure escapes the handler. Success and failure both return through update.
:::

## Handler Layers

Separating the Command definition from its handler lets update declare work without choosing how that work is implemented. Update imports `FetchCount`; application assembly supplies `FetchCountLayer` and the HTTP service it needs. A feature can expose its Commands to a parent while keeping its implementations in one composed Layer.

The two Layers serve different purposes:

| Layer             | What it supplies                                              |
| ----------------- | ------------------------------------------------------------- |
| `FetchCountLayer` | The application's request, decoding, and result Message logic |
| `Http.layer`      | The browser HTTP client used by that logic                    |

For an execution test, keep `FetchCountLayer` and provide a deterministic HTTP client beneath it. The request and result handling then run as they do in the application.

### Providing Services

Compose the HTTP provider beneath the handler at the application root:

::Snippet{name="commandHttpLayer" label="Providing the HTTP service"}

The entry point provides `AppLayer` to the application, as it provided the counter's `Layer` earlier. `Application.make` carries the unsatisfied requirements, `Application.provide` satisfies them, and `Runtime.run` requires a runnable application.

`Http.layer` is Foldkit's Fetch-backed client. The [Http guide](/core/http) explains its browser tracing defaults and customization. Keep the concrete provider at the root so the application and execution tests can select it, and so Commands share the same client.

### Constructing the Handler {#implementing-the-handler}

`toLayer` accepts either a handler or an Effect that constructs a handler. The plain handler above looks up `HttpClient` during each invocation. An Effect constructor can capture the stable client when the application Layer is built:

::Snippet{name="commandHandlerConstructor" label="Capturing a client during handler construction"}

The constructor runs once at application startup and returns a function. That function calls the same `fetchCount` operation on every invocation. The HTTP request happens when the returned function runs, not while the Layer is being built.

Looking up a service does not construct it. Both forms use an instance supplied by the application Layer. Choose an Effect constructor when preparing the handler requires acquisition or when capturing a stable service makes its dependency boundary clearer.

Keep changing values inside the invocation. Command args, the current time, and an active ManagedResource handle belong to the operation that uses them. Capturing a value in the constructor gives it application lifetime. [Layers](/core/layers) explains acquisition, context lookup, and provider lifetimes in depth.

### Inline Execution

When the definition and implementation belong together, put the handler in `execute`:

::Snippet{name="commandInlineExecution" label="Defining an inline handler"}

This alternative runs the same `fetchCount` logic and can use the same HTTP test service. Its HTTP service requirement flows directly to the application. A definition with a separate handler Layer contributes a named handler requirement instead, and the handler Layer carries its own service requirements.

Both forms describe work as data and produce declared result Messages. Use a separate handler Layer when application assembly should collect or select named implementations. Inline execution is useful for a small operation whose implementation belongs with its definition.

### Naming and Composition

Name an individual handler Layer after its definition: `FetchCountLayer`. A feature with several handlers combines them under one `Layer` export, consumed through its namespace, such as `Search.Layer`. The root combines feature handlers and shared services into `AppLayer`; the entry point imports that bundle. The [Project Organization](/patterns/project-organization#composing-handler-layers) guide shows the file layout and composition.

Give each Layer-backed Command definition a distinct name within an application. A Command accepts a Layer built from its own definition. Providing a Layer from a different definition with the same name fails when the Command runs.

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

Do not key an upload by its file name. Two rows may upload the same file and still need independent cancellation.

Foldkit prefixes every derived key with the Command name. Keep interruptible Command names unique across the application, or two definitions with the same name can cancel each other's work. For a reusable Submodel with several active instances, include its `instanceId` in the key. A single-instance Submodel needs no extra field.

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

The result Message does not carry the outcome because `Interrupted` and `NotFound` mean the same thing here: the key is free. Each request carries its generation so a result that finished just before `NotFound` cannot overwrite newer suggestions, even when the user returns to the same query.

### Recording Why Cancellation Happened

Use a different result Message when cancellation records a different fact. Clicking Cancel and selecting a replacement file mean different things, even though both interrupt `UploadFile`:

::Snippet{name="commandInterruptCauses" label="Recording the cancellation cause"}

The Message records why cancellation completed; update chooses the follow-up. Data needed for that decision, such as `uploadId` or the newly selected file, belongs in the payload. Avoid adding a second behavior tag to one result Message.

Use one result Message when the meaning is the same. A per-row Cancel button and Cancel all both record `CompletedCancelUploadFile`; they only differ in how many keys they interrupt.

If the desired follow-up can change before the Interrupt completes, store that intent in the Model. For example, a `CancellingToStop | CancellingToReplace` union lets a later Message replace the intent. The cancellation result then reads the current variant instead of obeying a decision captured earlier.

The [interrupting-commands example](/example-apps/interrupting-commands) shows concurrent uploads keyed by upload id, per-upload cancellation, Cancel all, and restarting work under a freed key.
