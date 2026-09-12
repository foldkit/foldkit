# Commands

## One-Shot Effects as Data {#overview}

A Command describes one side effect, such as an HTTP request, a delay, or a DOM focus call. Update returns that description as data. The Foldkit runtime executes it and dispatches the resulting Message.

Nothing happens while update runs. No request fires, timer starts, or DOM changes. Update returns a Model and a list of Commands, preserving the purity of every state transition.

:::Info{label="A different model for side effects"}
React event handlers often perform work directly by calling `fetch()`, starting a timer, or writing to `localStorage`. In Foldkit, update describes the work and the runtime performs it.
:::

The counter has returned an empty Commands array so far. A delayed reset puts that second return value to work:

::Snippet{name="counterCommands" label="commands example"}

## Anatomy of a Command

When `ClickedResetAfterDelay` arrives, update keeps the Model unchanged and returns `DelayReset()`. The runtime waits one second, then dispatches `CompletedDelayReset`. That new Message reaches update, which resets the count to zero.

`Command.define` gives the work a name and a result contract. A definition has three required parts:

- `messages` lists every Message the Command may produce.
- `execute` contains the Effect that produces one of those Messages.
- The first argument names the Command for DevTools, traces, and tests.

Two optional fields extend that contract. `args` defines a Schema for inputs that vary by dispatch. `interrupt` makes in-flight work explicitly interruptible.

Command names are verb-first imperatives such as `FetchWeather`, `FocusItems`, and `LockScroll`. A Command names work for the runtime to perform. Its result Message records what happened, using a past-tense name such as `SucceededFetchWeather`, `FailedFetchWeather`, or `CompletedLockScroll`.

## Testable by Design

Because Commands are data and update is pure, a test can simulate the update loop without running any Effects. Dispatch a Message, inspect the returned Command, resolve it with a result Message, and assert on the final Model.

::Snippet{name="counterCommandsTest" label="test example"}

The story starts at count 5, dispatches `ClickedResetAfterDelay`, and checks for `DelayReset`. It then resolves that Command with `CompletedDelayReset` and verifies the count is 0. Every transition remains visible.

Use `message` to dispatch Messages, `Command.resolve` to supply results, and `model` to assert on state. The [Testing](/testing) guide covers the full API.

## HTTP Requests

The same structure applies to network work. This version asks an API for the next count instead of incrementing locally:

::Snippet{name="counterHttpCommand" label="HTTP command example"}

`FetchCount` obtains `HttpClient` from the Effect context, executes the request, and decodes the response with Schema. Success produces `SucceededFetchCount`. `Effect.catch` converts failures into `FailedFetchCount`, so a failed request becomes another fact for update to handle instead of crashing the application.

`Effect.provide(Http.layer)` supplies Foldkit's Fetch-backed client with trace-header propagation disabled. Effect enables those headers by default, which can trigger browser CORS preflights against APIs and development proxies. A test can provide a mock client instead.

:::Info{label="Errors are tracked, not hidden"}
The Effect error channel records whether a Command can fail. Once every failure has been converted into a Message, the type confirms that the error channel is empty. Update then handles failure and success through the same Message loop.
:::

## Commands with Args

Many Commands need an input that changes from one dispatch to the next. For example: a weather lookup needs a zip code, a focus call needs an element id, and a delay may need a duration. Declare those values in `args`. The Command Definition then accepts a typed record, and `execute` receives that record when the runtime starts the work.

::Snippet{name="commandWithArgs" label="command with args example"}

Args appear beside the Command name in DevTools. Story and Scene tests can also match the exact dispatch with `Command.expectExact(FetchWeather({ zipCode: '90210' }))`.

Args should contain per-dispatch inputs, not every dependency used by the Effect. Module constants remain in lexical scope. App-wide services come from [Resources](/core/resources), Model-gated handles come from [ManagedResources](/core/managed-resources), and other Effect services can be obtained with `yield*`.

## Interrupting Commands

Commands normally run to completion. Sometimes the user cancels an upload or new input supersedes a request. Adding `interrupt` to the definition makes that work stoppable and adds an `Interrupt` constructor to the Definition.

`interrupt` determines the address of each invocation:

- `interrupt: true` uses the Command name as the key. Use it when at most one invocation is meaningfully in flight. `Interrupt` then needs only its `toMessage` function.
- `interrupt: { keyFields, toKey }` derives a key from selected args. Use it when concurrent invocations must be interrupted independently. The selected fields become the exact args required by `Interrupt`.

Foldkit prefixes a derived key with the Command name, so definitions with distinct names occupy distinct namespaces. A Command without declared args has no values from which to derive a key, so `interrupt: true` is its only form.

::Snippet{name="commandInterruptible" label="interruptible command example"}

### Choosing an Interruption Key

Key the work by the Model identity a user can cancel. For example, an upload row uses `uploadId`, while a document editor might use `documentId`. Do not key an upload by the file name: two rows may upload the same file and still need separate Cancel buttons.

::Snippet{name="commandInterruptKey" label="interruption key example"}

`keyFields` also controls the args accepted by `UploadFile.Interrupt`, so the cancellation site only needs `{ uploadId }`, not the original `file`.

The Command name prefixes every key. Keep interruptible Command names unique across the application, or two definitions with the same name can cancel each other's work. For a reusable Submodel with several live instances, include its `instanceId` in the key. A single-instance Submodel needs no extra field.

### Dispatching an Interrupt

`Definition.Interrupt` builds an ordinary Command. With `interrupt: true`, pass only the function that turns the outcome into a Message. With an args-derived key, pass the key args first:

::Snippet{name="commandInterruptConstructor" label="Interrupt constructor example"}

The result is `Interrupted` when at least one invocation stopped. Its normal result Message will never dispatch, so the cancellation handler owns the next Model state. `NotFound` means no invocation held the key; the work had already finished or never started.

Several invocations can hold one key. The key is only an address, and dispatching more work does not cancel anything. An Interrupt stops every invocation currently registered at that address.

### Sequencing Replacement Work

Wait for cancellation to finish before starting the replacement. Commands returned together run concurrently, so `[FetchSuggestions.Interrupt(...), FetchSuggestions(...)]` races the old request against the new one.

::Snippet{name="commandInterruptReplacement" label="replacement sequencing example"}

The first `UpdatedQuery` received while a request runs increments `generation`, enters `Cancelling`, and returns one Interrupt. Incrementing the generation makes the old request's result stale before cancellation begins. More query changes replace `model.query` without dispatching another Interrupt. When cancellation completes, the handler reads the latest query and starts one replacement with the current generation.

The result Message does not carry the outcome because `Interrupted` and `NotFound` mean the same thing here: the key is free. Each request carries its generation so a result that finished just before `NotFound` cannot overwrite newer suggestions, even when the user returns to the same query.

### Recording Why Cancellation Happened

Use a different result Message when cancellation records a different fact. Clicking Cancel and selecting a replacement file mean different things, even though both interrupt `UploadFile`:

::Snippet{name="commandInterruptCauses" label="cancellation cause example"}

Do not add a second behavior tag to one result Message. The Message records why cancellation completed; update chooses the follow-up. Data needed for that decision, such as `uploadId` or the newly selected file, belongs in the payload.

Use one result Message when the meaning is the same. A per-row Cancel button and Cancel all both record `CompletedCancelUploadFile`; they only differ in how many keys they interrupt.

If the desired follow-up can change before the Interrupt completes, store that intent in the Model. For example, a `CancellingToStop | CancellingToReplace` union lets a later Message replace the intent. The cancellation result then reads the current variant instead of obeying a decision captured earlier.

The [interrupting-commands example](/example-apps/interrupting-commands) shows concurrent uploads keyed by upload id, per-upload cancellation, Cancel all, and restarting work under a freed key.

:::Info{label="Interruption is for one-shot work"}
Use interruption for work that is structurally a Command, normally runs once, and only exceptionally needs to stop. For example: an in-flight HTTP request, file read, or upload. If the Model should control the lifetime of ongoing work, use a Subscription or ManagedResource instead.
:::

Unless interrupted, a Command fires once and produces one declared result Message when it completes. Work tied to a particular DOM element's lifetime belongs in [Mount](/core/mount).
