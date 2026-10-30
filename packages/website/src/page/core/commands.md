# Commands

## One-Shot Effects as Data {#overview}

Have update return a Command when the Runtime should perform one-time work in response to a Message: make an HTTP request, wait before a reset, or focus a button. The Command describes the work as data. The Runtime performs it and dispatches its result as another Message. Update handles that Message to change the Model.

This separation keeps update pure. A click can return a request without sending it, and a test can inspect that request without contacting a server. The same update handles the user's action and the eventual success or failure.

A Command has two halves that live in different places:

- The declaration, made at module level with `Command.define`, names the work, its args, and the Messages it can produce. It contains no implementation, so a test can import it without the services the work needs.
- The handler, returned under `commands` from the Block's constructor, performs the work. It closes over the services the constructor yields.

:::Info{label="A complete application"}
The [weather example](/example-apps/weather) connects form input, Command args, HTTP response decoding, failure Messages, the HTTP client service, and application entry wiring.
:::

## Anatomy of a Command

The counter's update has only changed the count so far. Add a button that resets it after one second:

::Snippet{name="counterCommands" label="Counter with a delayed reset"}

Four pieces connect the work to update:

- `Command.define('WaitBeforeReset', { messages })` declares the Command and the result Messages it can produce. It sits above the class because it names `Message.CompletedWaitBeforeReset`.
- `Command: [WaitBeforeReset]` on the class lists the Commands this Block owns.
- `commands: { WaitBeforeReset: () => ... }` in the constructor's result implements it. The handler returns an Effect that waits one second and produces `CompletedWaitBeforeReset`.
- `WaitBeforeReset()` in update creates the Command value. Creating the value does not start the timer.

The compiler connects the pieces. A listed Command without a handler is a type error, and so is a handler whose Effect produces a Message the declaration does not list.

The entry is the same as before:

::Snippet{name="counterCommandsEntry" label="Starting the counter"}

When the user clicks **Reset after one second**, the loop is:

1. The view dispatches `ClickedResetAfterDelay`.
2. Update returns the unchanged Model and `WaitBeforeReset()`.
3. The Runtime runs the `WaitBeforeReset` handler, which waits one second.
4. The Runtime dispatches `CompletedWaitBeforeReset`.
5. Update receives that Message and sets `count` to zero.

The constructor runs once for the instance, so the `commands` record is built once. Each `WaitBeforeReset` Command runs the handler again and starts its own timer.

### Command and Result Names

Command names are verb-first imperatives such as `FetchWeather`, `FocusItems`, and `LockScroll`. Name the effect the handler performs. Here, `WaitBeforeReset` waits; the later update handler resets the count. Result Messages use `Completed` for ordinary completion, or `Succeeded` and `Failed` when the distinction matters: `CompletedWaitBeforeReset`, `SucceededFetchWeather`, and `FailedFetchWeather`.

Command names are local to the Block that lists them. Two Blocks can both declare `FetchCount`. DevTools shows each Command with the path of the instance that returned it.

## Testing Update Decisions {#testable-by-design}

A story can test this loop without starting the application or waiting for a timer. Dispatch the click, check the returned Command, supply its result, and inspect the next Model:

::Snippet{name="counterCommandsStory" label="Delayed reset in a story"}

The story starts at count 5, checks that update returns `WaitBeforeReset`, then supplies `CompletedWaitBeforeReset` and checks that the count is 0. It tests the application's decisions and state transitions. A story never runs Command handlers, so it does not wait one second.

Use `message` to dispatch Messages, `Command.resolve` to supply results, and `model` to assert on state. The [Testing](/testing) guide covers story and scene steps. [Testing the handler](#testing-the-handler-through-its-services) below covers running the real Effect.

## Commands with Args

Declare `args` for inputs that vary from one dispatch to the next. This counter passes `delayMs` from a click Message to the Command:

::Snippet{name="commandWithArgs" label="Passing a delay to a Command"}

The view supplies the delay in `ClickedResetAfterDelay`. The `args` field is a record of Schemas. `WaitBeforeReset({ delayMs })` accepts that typed record, and the handler receives it when the Runtime runs the Command. The Model stays unchanged until `CompletedWaitBeforeReset` arrives.

Args also appear beside the Command name in DevTools. Story and scene tests can match one dispatch by its args with `Command.expectExact(WaitBeforeReset({ delayMs: 500 }))`.

Use args for per-dispatch data: a zip code, an element id, or a duration. Services come from the constructor. A module constant can stay in lexical scope. A handle that exists only while the Model needs it belongs to a [resource Block](/core/managed-resources).

## HTTP Requests

Network work follows the same loop. The view dispatches `ClickedFetchCount`, and update returns a request for the next count:

::Snippet{name="counterHttpCommand" label="Fetching and decoding a count"}

### Handling Request Results

The constructor yields `HttpClient.HttpClient` once. The `FetchCount` handler passes that client to `fetchCount`, which builds the request, checks for a successful status, and decodes the JSON with Schema. It produces `SucceededFetchCount` with the decoded count, and update puts that value in the Model.

`Effect.catch` converts request, status, and decoding failures into `FailedFetchCount`. A failed request becomes a fact for update to handle. This small counter keeps its current count on failure; an application can store an error state and render a retry button in that branch.

:::Info{label="Handle failures as Messages"}
A Command handler must convert its expected failures into declared result Messages. The Effect error channel then confirms that no typed failure escapes the handler. Success and failure both return through update.
:::

## Services for Handlers {#handler-layers}

Because `ApplicationLive` yields `HttpClient.HttpClient`, the Layer it returns requires that service. The entry provides it with `Http.layer`, Foldkit's Fetch-backed client:

::Snippet{name="counterHttpEntry" label="Providing the HTTP client"}

A program whose Layer leaves `HttpClient` unprovided does not compile. The [Http guide](/core/http) explains the client's tracing defaults and customization, and [Layers](/core/layers) covers how services reach Blocks.

### Handler Lifetime {#implementing-the-handler}

The constructor runs once per instance and the handler runs once per Command. Put each value where its lifetime belongs:

- Yield services in the constructor. The instance looks each one up once and every Command it runs shares it.
- Keep per-dispatch values in args. The handler receives them each time it runs.
- Read changing values, such as the current time, inside the handler's Effect.

Application state and workflow decisions belong in the Model and update, not in variables the handler closes over. A handler that records which requests are pending in a closure hides that state from update, DevTools, and tests.

### Testing the Handler Through Its Services

A story resolves Commands without running handlers. To test the request and decoding logic, test the Effect the handler runs. `fetchCount` takes the client as an argument, so a test passes a client that returns a known response:

::Snippet{name="commandHandlerTest" label="Running the request logic with a test client"}

The test covers the request, the status check, the Schema decoder, and the result Message. More cases can return a failed response or invalid JSON to exercise the failure conversion.

Choose the service boundary according to the code the test should cover. If an API service contains authentication, retries, or other application policy, keep that service and replace its lower HTTP transport. Replacing the API service would leave its policy outside the test.

## Interrupting Commands

Commands normally run to completion. Make a Command interruptible when a user needs to cancel it or new input supersedes the work.

:::Info{label="Choosing a lifetime"}
Use Command interruption for one-time work such as a pending request, file read, or upload. When the Model controls the lifetime of ongoing work, use a [Subscription](/core/subscriptions) or a [resource Block](/core/managed-resources). Work tied to a particular DOM element's lifetime belongs in [Mount](/core/mount).
:::

### Cancelling a Pending Command

Add `interrupt: true` to the timer definition to give it an `Interrupt` constructor. A Cancel button can return that cancellation Command:

::Snippet{name="commandInterruptible" label="Cancelling a pending reset"}

`WaitBeforeReset.Interrupt` creates data just like `WaitBeforeReset()`. The Runtime performs the cancellation and dispatches the Message produced by the function passed to `Interrupt`. An interrupted timer does not dispatch `CompletedWaitBeforeReset`, so it does not reset the count.

With `interrupt: true`, the Command name is the interruption key. Use this form when invocations do not need independent cancellation. A Command without declared args has no values from which to derive a key, so this is its only interruption form.

### Choosing an Interruption Key

Use `interrupt: { keyFields, toKey }` when concurrent invocations need separate Cancel buttons. Key the work by the Model identity a user can cancel. For example, an upload row uses `uploadId`, while a document editor might use `documentId`.

::Snippet{name="commandInterruptKey" label="Cancelling uploads independently"}

`keyFields` selects the args used to derive the interruption key. It also controls the args accepted by `UploadFile.Interrupt`: the cancellation site needs `{ uploadId }`, not the original `file`.

`toKey` receives only those selected own fields on both invocation and interruption. The handler still receives the full decoded args. The selected record has no prototype, so use `Object` helpers rather than inherited methods.

Inline literal tuples preserve exact selected fields. For an extracted policy, preserve the selected key in its annotation, such as `Command.InterruptOption<Args, 'uploadId'>`. A broad key union cannot guarantee that every possible field is present; its callback must handle uncertain fields as optional. Narrow a union of differently keyed policies before constructing the Command.

Do not key an upload by its file name. Two rows may upload the same file and still need independent cancellation.

Foldkit prefixes every derived key with the Command name, and each Block instance keeps its own registry of running invocations. An Interrupt only stops invocations that its own instance started, so two instances of one Block never cancel each other's work.

### Dispatching an Interrupt

With `interrupt: true`, pass the function that turns the outcome into a Message. With an args-derived key, pass the key args first. These cancellation Commands use the timer and upload definitions above:

::Snippet{name="commandInterruptConstructor" label="Creating cancellation Commands"}

The outcome is `Interrupted` when at least one invocation stopped. A stopped invocation's normal result Message will not dispatch, so update handles its cancellation result instead. `NotFound` means no invocation held the key; the work had already finished or never started.

Several invocations can hold one key. Dispatching more work does not cancel anything. An Interrupt stops every invocation currently registered at that address.

### Sequencing Replacement Work

Wait for cancellation to finish before starting the replacement. Commands returned together run concurrently, so `[FetchSuggestions.Interrupt(...), FetchSuggestions(...)]` races the old request against the new one.

The next Block is a search feature. Its Model holds the query, suggestions, a generation counter, and `searchState`. Its `FetchSuggestions` Command uses `interrupt: true`, accepts `query` and `generation`, and includes that generation in success and failure Messages.

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
