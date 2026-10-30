# Story

## Testing the Update Loop

`Story` calls update with the Messages you send. Commands stay as data until the test supplies their result Messages. You can test a complete state transition without a DOM, a timer, or a running Effect.

The entire test is one `story` call. Pass the Block's Layer, send a Message, resolve any Commands, and assert on the next Model. The story starts from the Model the Block's constructor returns; `given` replaces it when a test needs a different starting point.

## The API

### Import Story Steps

Import the steps you need from `foldkit/story`.

- `story` runs the test. It takes the Block's Layer, the root's constructor args when it has any, and then the steps.
- Top-level steps set the Model, send Messages, group reusable setup, and inspect results: `given`, `message`, `messageWith`, `steps`, `model`, `expectOutMessage`, and `expectNoOutMessage`.
- The `Command` namespace handles pending Commands: `resolve`, `resolveAll`, `resolveAllExact`, `expectHas`, `expectExact`, `expectNone`, `at`, and `argsOf`.

Use named imports when the file contains only Story tests. If a file contains both Story and Scene tests, import the namespaces from `foldkit` so `Story.given` and `Scene.given` stay distinct.

::Snippet{name="testingApi" label="API reference"}

### Match Commands by Definition or Instance

A Command matcher accepts either a Definition or an instance. A Definition matches any pending Command from that declaration. An instance also checks that the arguments are structurally equal.

Use `FetchWeather` when the test only cares that this Command was returned. Use `FetchWeather({ zipCode: '90210' })` when the zip code is part of the contract. `Command.at(path, matcher)` narrows either form to one Block instance, for sibling instances with identical pending Commands. See [Testing a Parent and Its Children](/testing#testing-a-parent-and-its-children).

### Inspect Captured Command Arguments

Use `Command.argsOf(Definition)(pending)` when a test helper needs the args captured on a pending Command. It returns `Some` of the Definition's exact args type when the pending Command came from that Definition, and `None` otherwise. An argless match returns `Some(undefined)`.

`argsOf` does not choose among several matching Commands. Map it across `simulation.commands`, then state the count your helper requires. Construct an instance from the projected args when the next step should resolve that exact Command.

::Snippet{name="testingCommandArgs" label="Inspect captured Command arguments"}

:::Info{label="Mount lifecycle is a Scene concern"}
Story does not render the view, so the OnMount lifecycle is not observable from a Story test. Tests that need to acknowledge Mounts use Scene's `Mount.resolve` and the related steps; see the [Scene](/testing/scene) page.
:::

## Your First Test

Here’s a test for the delayed reset from the [Commands](/core/commands) page. Clicking reset starts a one-second delay. When the delay completes, the count returns to zero.

::Snippet{name="counterCommandsTest" label="Delayed-reset Story test"}

Read it from top to bottom. The Model starts at 5. `ClickedResetAfterDelay()` returns `WaitBeforeReset`. The test resolves that Command with `CompletedWaitBeforeReset()`, which update handles by setting the count to 0.

## Multi-Step Flows

### Resolve Commands in Order

Keep each Command result next to the Message that caused it. `Command.resolve`, `Command.resolveAll`, and `Command.resolveAllExact` let a longer test stay chronological:

::Snippet{name="testingWeatherFlow" label="Multi-step test"}

The test does not run an HTTP request. It declares that `FetchWeather` succeeded, feeds the resulting Message through update, and checks the Model that the view will render.

:::Info{label="Resolvers are a queue"}
Each `resolveAll` entry resolves one matching Command in declaration order. Three `[FetchCount, message]` entries resolve three `FetchCount` Commands. For N identical responses, use `Array.makeBy(n, () => [Definition, message])`.

Unused resolvers can match later Commands. A new resolver replaces any leftover resolver with the same Definition or instance shape.
:::

:::Info{label="Exact resolution"}
Use `resolveAllExact` when the resolver list is also a claim about which Commands update returned. It walks cascades like `resolveAll`, but every listed entry must match one Command within that call and no Command may remain unresolved. Repeated entries sharing a Definition consume repeated Commands in declaration order. Supplied resolvers never carry forward.
:::

### Deliver a Message While a Command Is Pending

`message` can deliver another fact while Commands are pending. Existing Commands stay pending, and any Commands returned by the new update are added after them. Resolve each Command explicitly when its result should arrive. `story` throws at the end if any Command is still pending, so every Command update returns must be accounted for.

::Snippet{name="testingConcurrentMessages" label="Deliver a Message while a Command is pending"}

The increment arrives before the delayed reset's result. The test checks that the same reset Command is still pending, then supplies its completion.

### Build a Message from the Current Model

Use `messageWith(model => Message.Variant(...))` when a Message carries a value produced by an earlier update, such as a request generation or a session id. The callback receives the Model at the point where that step runs. Otherwise `messageWith` behaves like `message`.

::Snippet{name="testingStoryMessageWith" label="Build a Message from the current Model"}

### Deliver a Stream or Subscription Message

A Story never starts a Block's `stream` or `subscriptions`. Send the Message the source would produce with `message`. For a child instance's Stream, wrap the Message with `Block.deliver`.

::Snippet{name="testingStorySubscription" label="Deliver a Message a Subscription produces"}

A Story does not check whether the Subscription would be running for the current Model. When that matters, assert on the Model fields the Subscription's `dependencies` read.

### Resolve Child Commands

When resolving a Command returned by a [child Block](/core/block), pass the child's own result Message. Foldkit routes it back to the instance that returned the Command. See [Testing a Parent and Its Children](/testing#testing-a-parent-and-its-children) for a full example with `Block.deliver` and `Command.at`.

### UI Component Test Helpers

Before writing resolvers for an `@foldkit/ui` component, check the component's `test` namespace. It exports the component's Command and Mount Definitions so a test can resolve them, and some components export helpers that resolve a whole lifecycle at once. For example, the [Toast test helper](/ui/toast#testing) handles the animation and timer Commands for a newly shown toast that dismisses itself.

## Reusable Step Groups

Use `steps` when several stories share the same setup or Message sequence. The group keeps the Model, Message, and OutMessage types of every step inside it, so `story` still rejects a group built for a different Block.

::Snippet{name="testingReusableSteps" label="Reusable Story steps"}

A group can contain any step accepted by `story`, including `given`, `message`, Model assertions, Command steps, OutMessage assertions, and another `steps` group. `story` runs the group in declaration order at the position where it appears.

Do not use Effect's `flow` to group Story steps. Message and OutMessage steps are typed data, not functions, and `steps` is the boundary that keeps their types. This does not replace `flow` for ordinary function composition elsewhere in an application.

## Testing Side Effects

### Test Returned Commands

Story tests the state machine. It does not run the Effect inside a Command.

### Test Command Effects

A Command handler closes over the services the Block's constructor yields. Write the handler as a function that takes those services, and give the constructor's `commands` record the result of calling it. A test can then call the same function with a stub service and run the Effect it returns.

Here the weather Block's `fetchWeather` takes an `HttpClient`. The test passes a client that returns a canned response, then checks the Message the handler produces:

::Snippet{name="testingCommandEffect" label="Command Effect test"}

The two tests cover different contracts. Story checks which Command update returns and what update does with its result Message. The Effect test checks the work the Command performs.
