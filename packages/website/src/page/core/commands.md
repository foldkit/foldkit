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

### Choosing a Key

Derive the key from the Model identity that owns the in-flight work, such as a list item id or entity id. Update is pure, so it never generates a cancellation key. If two invocations can be targeted separately, the Model already contains the fact that distinguishes them. Two uploads of the same file still need different keys because the Model tracks them as separate entities.

The Command name is the interrupt namespace, so interruptible Command names must be unique across the application. Two definitions with the same name share a key space. An Interrupt stops every holder of the addressed key, regardless of which duplicate definition dispatched it. Unique names also keep DevTools traces, Story matchers, and span names unambiguous.

Reusable Submodels need the same care. Two instances that run the same Command share its key unless the args distinguish them. Include the instance identity in the key args, such as `({ instanceId }) => instanceId`. A Submodel with only one instance needs no extra scoping.

### The Interrupt Constructor

`Definition.Interrupt` returns an ordinary Command. For a name-keyed definition, it accepts a function from the interruption outcome to a Message. For a definition keyed by args, those key args come first. Update stays pure, DevTools records the dispatch, and tests resolve it like any other Command.

The outcome is `Interrupted` when at least one in-flight Command was stopped. It is `NotFound` when nothing held the key because the work had already completed or never started. Those two cases are intentionally indistinguishable within `NotFound`.

After `Interrupted`, the target's result Message is guaranteed never to dispatch. The code that requested interruption therefore owns the state transition. In the example, that branch marks the upload `Cancelled`; the `NotFound` branch leaves the Model alone.

A key is an address, not a lock. Several invocations may run under one key, and dispatching a Command never stops existing work. Only an explicit Interrupt Command stops the current holders. Cancellation therefore remains visible in update, DevTools history, and tests.

### Replacing Cancelled Work

Start replacement work from the Interrupt's result Message. Return the new Command from the `CompletedCancel<CommandName>` handler. Commands returned in one list run concurrently with no ordering guarantee, so returning the Interrupt and replacement together creates a race.

For a typeahead search, `ChangedQuery` can store the newest query and return the cancel Command. `CompletedCancelFetchWeather` then reads the current query from the Model and starts the replacement. Both interruption outcomes can proceed because `Interrupted` and `NotFound` agree on the relevant fact: the key is now free.

### Cancellations with Multiple Meanings

If cancellation can mean different things, give each cause its own result Message. A Cancel button and choosing another file produce different facts:

```text
CompletedCancelUploadFileDueToClickedCancel
CompletedCancelUploadFileDueToSelectedNewFile
```

The `toMessage` function lives at the dispatch site, so each handler can construct the Message that records its cause.

Do not encode the intended follow-up in that Message. A Message records what happened; update decides what to do next. Use payload fields for data the handler needs, such as `uploadId`, not as a second behavior tag. When every cancellation records the same meaning, one `CompletedCancel<CommandName>` Message is enough. A per-upload Cancel button and a Cancel all button differ in how many keys they interrupt, not in what each result means.

Intent chosen at dispatch time can become stale when cancellation contexts interleave on the same key. The user may click Cancel, then type again before the acknowledgment arrives. Store the current intent in the Model as a union such as `CancellingToStop | CancellingToRevalidate`. Later Messages can update that intent, and one acknowledgment handler can read the newest state. The acknowledgment only says that the key is free; the Model decides what follows now.

The [interrupting-commands example](/example-apps/interrupting-commands) shows concurrent uploads keyed by upload id, per-upload cancellation, Cancel all, and restarting work under a freed key.

:::Info{label="Interruption is for one-shot work"}
Use interruption for work that is structurally a Command, normally runs once, and only exceptionally needs to stop. For example: an in-flight HTTP request, file read, or upload. If the Model should control the lifetime of ongoing work, use a Subscription or ManagedResource instead.
:::

Unless interrupted, a Command fires once and produces one declared result Message when it completes. Work tied to a particular DOM element's lifetime belongs in [Mount](/core/mount).
