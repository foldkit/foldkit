# Story

## Testing the Update Loop

`Story` calls update with the Model and Messages you provide. Commands stay as data until the test supplies their result Messages. You can test a complete state transition without a DOM, a timer, or a running Effect.

The entire test is one `story` call. Start from a Model, send a Message, resolve any Commands, and assert on the next Model.

## The API

### Import Story Steps

Import the steps you need from `foldkit/story`.

- Top-level steps start the test, group reusable setup, send Messages, and inspect results: `story`, `steps`, `given`, `message`, `messageWith`, `model`, `expectOutMessage`, and `expectNoOutMessage`.
- The `Command` namespace handles pending Commands: `argsOf`, `resolve`, `resolveAll`, `resolveAllExact`, `expectHas`, `expectExact`, and `expectNone`.
- `Subscription.from(Block.subscriptions)` creates emission steps from a completed Block's registered Subscription graph.

Use named imports when the file contains only Story tests. If a file contains both Story and Scene tests, import the namespaces from `foldkit` so `Story.given` and `Scene.given` stay distinct.

::Snippet{name="testingApi" label="API reference"}

### Match Commands by Definition or Instance

A Command matcher accepts either a Definition or an instance. A Definition matches the originating declaration, even after a Binding qualifies its displayed name. An instance also checks structurally equal arguments, and a bound instance selects its composition path.

Use `FetchWeather` when the test only cares that this Command was dispatched. Use `FetchWeather({ zipCode: '90210' })` when the placement and zip code are part of the contract. Do not compare `command.name` with a string or with `Definition.name`: different owners may declare the same local name, while a bound Command's displayed name includes its placement.

For before-and-after examples covering generated child delivery and completed UI Blocks, see [Migrate an existing test suite](/testing#migrate-an-existing-test-suite).

### Inspect Captured Command Arguments

Use `Command.argsOf(Definition)(pending)` when a test helper needs the args captured on pending Command metadata. It matches the Definition's source identity, including through qualified Binding paths, and returns `Option` of the Definition's exact args type. An argless match returns `Some(undefined)`; `None` means the pending Command came from another source.

Projection does not choose an occurrence. Map it across `simulation.commands`, then state the cardinality your helper requires. It also leaves the pending value's parent Message mapping, Effect channels, qualified name, and keys unchanged. Construct an instance from the projected args when the next step should resolve that exact dispatch.

::Snippet{name="testingCommandArgs" label="Inspect captured Command arguments"}

:::Info{label="Mount lifecycle is a Scene concern"}
Story does not render the view, so the OnMount lifecycle is not observable from a Story test. Tests that need to acknowledge mounts use Scene's `Mount.resolve` and the related steps; see the [Scene](/testing/scene) page.
:::

## Your First Test

Here’s a test for the delayed reset from the [Commands](/core/commands) page. Clicking reset starts a one-second delay. When the delay completes, the count returns to zero.

::Snippet{name="counterCommandsTest" label="Delayed-reset Story test"}

Read it from top to bottom. The Model starts at 5. `ClickedResetAfterDelay()` returns `DelayReset`. The test resolves that Command with `CompletedDelayReset()`, which update handles by setting the count to 0.

## Multi-Step Flows

### Resolve Commands in Order

Keep each Command result next to the Message that caused it. `Command.resolve`, `Command.resolveAll`, and `Command.resolveAllExact` let a longer test stay chronological:

::Snippet{name="testingWeatherFlow" label="Multi-step test"}

The test does not run an HTTP request. It declares that `FetchWeather` succeeded, feeds the resulting Message through update, and checks the Model that the view will render.

:::Info{label="Resolvers are a queue"}
Each `resolveAll` entry resolves one matching dispatch in declaration order. Three `[FetchCount, message]` entries resolve three `FetchCount` dispatches. For N identical responses, use `Array.makeBy(n, () => [Definition, message])`.

Unused resolvers can match later dispatches. A new resolver replaces any leftover resolver with the same Definition or instance shape.
:::

:::Info{label="Exact resolution"}
Use `resolveAllExact` when the resolver list is also a claim about which Commands were dispatched. It walks cascades like `resolveAll`, but every listed entry must match one dispatch within that call and no actual Command may remain unresolved. Repeated entries sharing a Definition consume repeated dispatches in declaration order. Supplied resolvers never carry forward.
:::

:::Info{label="Unresolved Commands"}
`message` can deliver another fact while Commands are pending. Existing Commands remain pending, and any Commands produced by the new Message are appended. Resolve each Command explicitly when its result should arrive; dispatching a Message does not run a stored resolver. `story` throws at the end if any Commands remain unresolved. Every Command your update function produces must be accounted for.
:::

::Snippet{name="testingConcurrentMessages" label="Deliver a Message while a Command is pending"}

The increment arrives before the delayed reset's result. The test checks that the same reset Command is still pending, then supplies its completion. Scene interactions retain their separate pending-Command and Mount checks.

### Build a Message from the Current Model

Use `messageWith(model => Message.Variant(...))` when a Message carries a value produced by an earlier update, such as a request generation or stream session. The callback receives the Model held when that step runs. It follows `message` semantics: existing Commands remain pending and Commands returned by the new update are appended.

::Snippet{name="testingStoryMessageWith" label="Build a Message from the current Model"}

Give an extracted callback its precise Model annotation so a reusable `steps` group retains the same update contract as an inline step.

### Deliver a Subscription Message

Use `Subscription.from(CompletedBlock.subscriptions)` when a Story needs to deliver a fact from a registered Subscription. The emitter accepts a registered entry and that entry's decoded Message. It applies the same generated child delivery used by Scene and the Runtime without starting a Stream or constructing its dependencies.

::Snippet{name="testingStorySubscription" label="Deliver a registered Subscription Message"}

Pass the raw child entry only when it identifies one registration. If a child Subscription appears at multiple placements, select the intended bound entry from the completed Block's `subscriptions` record. A composition-only test can build the same record with `Scene.subscriptions(composition, localSubscriptions?)`; that helper exposes the shared registered graph when no completed Block exists yet.

### Resolve Child Commands

When resolving a Command from a [child Block](/core/block), pass the child's result Message. Story applies the parent Message mapping automatically.

### UI Component Test Helpers

Before writing resolvers for an `@foldkit/ui` component, check the completed component's `test` namespace for lifecycle helpers. These helpers preserve the component instance's Command identity while resolving its internal transitions. For example, the [Toast test helper](/ui/toast#testing) handles the animation and timer Commands for a newly shown toast that auto-dismisses.

## Reusable Step Groups

Use `steps` when several stories share the same setup or Message sequence. The group preserves the Model, Message, and OutMessage constraints of every step inside it, so the update passed to `story` still rejects a group built for a different program.

::Snippet{name="testingReusableSteps" label="Reusable Story steps"}

A group can contain any step accepted by `story`, including `given`, `message`, Model assertions, Command steps, OutMessage assertions, and another `steps` group. `story` runs the group in declaration order at the position where it appears.

Do not use Effect's `flow` to group Story steps. Message and OutMessage steps are typed data, not functions, and `steps` is the boundary that preserves their types. This does not replace `flow` for ordinary function composition elsewhere in an application.

## Testing Side Effects

### Test Returned Commands

Story tests the state machine. It does not run the Effect inside a Command.

### Test Command Effects

To test a Command's work, execute its Effect with the feature's real handler Layer and a deterministic service Layer. For example, `FetchWeather.layer` supplies its real handler, while a test HTTP client controls the responses. The test checks request construction, response parsing, and the resulting Message:

::Snippet{name="testingCommandEffect" label="Command Effect test"}

The two tests cover different contracts. Story checks which Command update returns and what update does with its result Message. The Effect test checks the work the Command executes.

A whole-application execution test uses the same boundary at the application root. Keep the real Command, Subscription, Mount, and ManagedResource handler Layers, replace their dependency providers, and then build the application Layer. Replacing a complete handler can orchestrate a result path, but that narrower test does not test the replaced handler.
