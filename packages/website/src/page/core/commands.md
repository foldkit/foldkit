# Commands

## Overview

A Command is a description of a side effect: an HTTP request, a one-shot delay, a DOM focus call. The update function doesn’t actually do anything on its own. It returns data, and the Foldkit runtime reads the Commands and carries them out.

In the [restaurant analogy](/core/architecture#the-restaurant-analogy), Commands are the slips the waiter hands to the kitchen. The waiter doesn’t cook. They describe what’s needed and hand it off. The kitchen does the work and reports back when it’s done.

When update runs, no HTTP request fires, no timer starts, no DOM changes. It returns a new Model and a list of Commands that describe what should happen, and the runtime executes them.

:::Info{label="A different model for side effects"}
In React, event handlers do things directly: call `fetch()`, start a timer, write to `localStorage`. In Foldkit, update is pure. It describes what should happen and the runtime does it.
:::

So far, update has been returning an empty Commands array. Let’s put it to use. Say we want a delayed reset: when the user clicks reset, the count resets after one second:

::Snippet{name="counterCommands" label="commands example"}

## Anatomy of a Command

Look at what update does when `ClickedResetAfterDelay` arrives: it returns the Model unchanged, along with `DelayReset()`, a Command that describes a one-second delay. The update function didn’t start a timer. It handed the runtime a description that says “wait one second, then send me `CompletedDelayReset`.” The runtime does the waiting. When the delay fires, `CompletedDelayReset` arrives as a new Message, and update resets the count to zero.

A Command is a struct with three fields: `name`, identifying what the Command does; `args`, the typed input record (when declared); and `effect`, the Effect the runtime executes. You create one in two curried steps: first, declare the identity and shape with `Command.define`; then call the result with an Effect (or with a builder that receives the typed args, when args are declared) to produce the Command value.

This is the same idea as Messages. Just as `m()` gives a Message a name that the type system knows, `Command.define` gives a Command a name and shape that DevTools can display, tests can reference, and traces can track. The name and args aren’t debug strings. They’re first-class values.

Names are verb-first imperatives: `FetchWeather`, `FocusItems`, `LockScroll`. Messages describe what happened (past tense), Command names are imperatives: instructions to the runtime.

Args carry the inputs that vary per dispatch. Anything else the Effect needs comes in through the Effect itself: module-level constants live in lexical scope, app-wide dependencies arrive through Foldkit `Resources`, model-driven handles arrive through `ManagedResources`, and any service tag on the Effect’s context channel is pulled with `yield*`. Args don’t have to carry every value the Effect uses; they carry the per-dispatch inputs.

## Testable by Design

Commands aren’t just a fancy way to organize side effects. They’re the reason Foldkit programs are easy to test. Because update is pure and Commands are data, you can simulate the entire update loop without running any Effects. Send a Message, check that the right Command was produced, resolve it with a result, and verify the Model.

::Snippet{name="counterCommandsTest" label="test example"}

The test reads as a story: start from a Model with count 5, send `ClickedResetAfterDelay()`, verify that update returned a `DelayReset` Command, resolve it with `CompletedDelayReset()`, and verify the count is 0. Every step is visible. The simulation called update, resolved the Command with the Message you provided, fed that back through update, and arrived at the final state.

Send Messages with `Story.message`, resolve Commands inline with `Story.Command.resolve`, and assert with `Story.model`. See the [Testing](/testing) guide for the full API.

## HTTP Requests

Now, what if we want to get the next count from an API instead of incrementing locally? We can create a Command that performs the HTTP request and returns a Message when it completes:

::Snippet{name="counterHttpCommand" label="HTTP command example"}

Let’s zoom in on `FetchCount` to see how an HTTP-backed Command takes shape. The Effect pulls `HttpClient` from the context, executes a typed request, decodes the JSON response with `Schema`, and produces `SucceededFetchCount`. Failures get caught and turned into `FailedFetchCount` Messages, so the runtime always sees a result. `Effect.provide(Http.layer)` wires the live implementation from `foldkit/http`: Effect’s Fetch-backed client with trace header propagation disabled. Effect’s default writes `traceparent` headers onto every request, a server-side default that in the browser triggers CORS preflights against plain APIs and dev proxies. Tests can swap it for a mock.

:::Info{label="Errors are tracked, not hidden"}
Commands use Effect’s typed error channel: if a Command can fail, the type signature tells you. `Effect.catch` turns failures into Messages like `FailedFetchCount`, and once all errors are handled, the type confirms it. The update function handles errors the same way it handles success: as facts about what happened.
:::

## Commands with Args

The Commands so far have taken no inputs. But many Commands need values that vary per dispatch: the zip code for a weather lookup, the element id for a focus call, the duration for a delay. Declare those values as an args schema between the Command name and the result Messages. The factory then receives them as a typed record, and call sites pass them in when dispatching.

::Snippet{name="commandWithArgs" label="command with args example"}

Args appear in DevTools alongside the Command name and let Story/Scene tests assert on the exact dispatch with `Scene.Command.expectExact(FetchWeather({ zipCode: '90210' }))`.

## Interrupting Commands

Commands normally run to completion. Sometimes the user changes their mind first, for example an upload they no longer want or a search superseded by new input. `Command.Interruptible.define` declares a Command that can be stopped mid-flight. It works like `Command.define` with one addition: a key that identifies the invocation. The key function is stated once at the definition and maps the args to whatever distinguishes invocations; Foldkit prefixes it with the Command name automatically, so keys never collide across definitions. A Command with no declared args needs no key function at all: its key is the Command name.

::Snippet{name="commandInterruptible" label="interruptible command example"}

Derive the key from the Model identity that owns the in-flight work, for example a list item id or an entity id. The update function is pure, so keys are never generated. If two invocations are distinguishable enough to cancel one and not the other, the Model already holds the fact that distinguishes them, and that fact is the key. Two uploads of the same file still get different keys, because the Model tracks each upload as its own entity with its own id.

The Command name is the interrupt namespace, so interruptible Command names must be unique across the app. Two definitions that share a name share a key space, and an Interrupt stops every holder of its key regardless of which definition dispatched it. Unique names are already the rule in practice, because DevTools traces, Story matchers, and span names all identify Commands by name.

The same reasoning covers reusable Submodels. Two instances of one Submodel running the same Command share a key unless something distinguishes them, so include the instance identity in the key args, for example `({ instanceId }) => instanceId`. A Submodel that appears in a list already threads an instance id through its Message lifting; the Command args carry the same id. A Submodel with a single instance needs no scoping.

The definition carries an `Interrupt` constructor. It takes the key args and a function from the interrupt outcome to a Message, and returns an ordinary Command: update stays pure, DevTools shows the dispatch, and tests resolve it like any other Command. The outcome is `Interrupted` when an in-flight Command was stopped, or `NotFound` when nothing held the key because the Command already completed or was never dispatched (the two are indistinguishable by design).

After `Interrupted`, the target’s result Message is guaranteed never to dispatch. Whoever requested the interruption owns the state transition, which is why the example moves the upload to `Cancelled` in the `Interrupted` branch and does nothing on `NotFound`.

A key is an address, not a lock. Any number of invocations can run under one key at once, and dispatching never interrupts anything. The only thing that stops an interruptible Command is an Interrupt Command returned from update, so every cancellation in the program is an explicit fact, visible in update, in DevTools history, and in tests.

To start a replacement after cancelling, sequence through the Interrupt’s result Message: return the new Command from the `CompletedCancel<CommandName>` handler. Commands in one batch run concurrently with no execution-order guarantee, so returning the Interrupt and its replacement together in one list is a race, not a sequence. A typeahead search makes the pattern concrete: `ChangedQuery` stores the query in the Model and returns the cancel Command, and the `CompletedCancelFetchWeather` handler returns the fetch, reading the latest query from the Model rather than the keystroke that triggered the cancel. Both outcomes proceed identically there, because `Interrupted` and `NotFound` agree on the fact that matters: the key is free now.

When the same Command can be cancelled with more than one meaning, for example a Cancel button and a fresh keystroke that supersedes the in-flight work, give each meaning its own result Message, named for its cause: `CompletedCancelUploadFileDueToClickedCancel` from one handler, `CompletedCancelUploadFileDueToSelectedNewFile` from the other. The `toMessage` function is written at the dispatch site and closes over it, so each handler builds its own Message. Name the cause that happened, never the action the handler intends next: a Message is a fact about the past, and the follow-up is a decision update makes at handling time. Messages are already tags, so two meanings get two Messages, not one Message carrying a cause field that update has to match a second time. Payload fields are for data the handler needs, for example the `uploadId`, not for selecting behavior. When every cancelling context records the same meaning, one plain `CompletedCancel<CommandName>` serves them all: a per-upload Cancel button and a Cancel all button differ only in how many keys they interrupt, so both dispatch sites share one Message.

When the cancelling contexts can interleave on the same key, anything chosen at dispatch time is a snapshot that can go stale: the user clicks Cancel, then types again before the acknowledgment arrives, and honoring the click would now be wrong. Keep the current intent in the Model instead, as a union such as `CancellingToStop | CancellingToRevalidate`, let later Messages update it, and have a single acknowledgment handler read it from the Model. Intent-first names are right here for the same reason cause-first names were right for Messages: a Message records what happened, while this Model field records what the app has decided to do next, and the Model is allowed to change its mind. The acknowledgment is only the fact that the key is free; what happens next is a function of the newest state, not of whichever context happened to dispatch the Interrupt.

The [interrupting-commands example](/example-apps/interrupting-commands) puts the whole pattern in one small app: concurrent uploads keyed by upload id, a per-upload Cancel that interrupts a single key, a Cancel all that returns one Interrupt per running upload, and a Restart that reuses a freed key.

:::Info{label="Interruption is for one-shot work"}
A long-running process that should stop when the Model says so is a Subscription or ManagedResource: gate it on a Model condition and it stops declaratively. Interruption is for work that is structurally a Command, fired once and normally left to finish, where stopping it is the exception: for example an in-flight HTTP request, a file read, or an upload.
:::

Commands fire once and produce one result Message when they finish (chosen from the result Messages they declare). For work bound to a specific DOM element’s lifetime, Foldkit has [Mount](/core/mount).
