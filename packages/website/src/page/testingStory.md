# Story

## Overview

Application behavior tests use the Story or Scene DSL. Deliver Messages or InMessages, resolve Commands and assert through those steps. Do not replace the runner with a chain of acquired update calls or direct Step applications. A pure fixture may build an initial Model or deliberately use `given(model)`; an advanced scoped fixture may need acquired initialization, graph identity or view context. Keep the behavior itself in the DSL. Pure domain and selector unit tests remain separate; raw transition tests belong to framework infrastructure.

A Block-aware Story acquires the chosen implementation, then calls its pure update with the Model and Messages you provide. Commands stay as data until the test supplies their result Messages. The returned Effect owns graph construction and cleanup; it does not run Command handlers or Streams.

In Vitest, return that Effect from `it.effect` in `@effect/vitest`. The runner awaits the result and manages the test Scope. Prefer direct Block-aware calls for ordinary scenarios; keep `withBlock` for fixtures needing initialized state, graph identity or custom view context. Start startup scenarios with `init` and explicit Command resolution so their initial Commands remain visible.

Pass `{ block: FeatureBlock, layer }` so the runner checks the Block contract against its selected implementation Layer. A test may name this pair `featureSubject` and reuse it. The contract declares the Model, Messages and other public types; the Layer supplies the executable implementation and its child graph.

Start with `init(...args)` when initialization is part of the scenario. It runs the real initializer and retains its startup Commands for explicit resolution. Use `given(model)` when the scenario starts from an intentional immutable fixture; it skips initialization and adds no startup Commands. Send subsequent Messages and resolve Commands through the DSL. `withBlock` supplies acquired initialization, graph identity or custom view context for advanced fixtures.

## The API

### Import Story Steps

Import the `Story` namespace from `foldkit`.

- Top-level steps start the test, group reusable setup, send Messages, and inspect results: `story`, `init`, `steps`, `given`, `message`, `messageIn`, `messageWith`, `model`, `models`, `expectOutMessage`, and `expectNoOutMessage`.
- The `Command` namespace handles pending Commands: `argsOf`, `resolve`, `resolveAll`, `resolveAllExact`, `expectHas`, `expectExact`, `expectExactInOrder`, and `expectNone`.
- `Subscription.from(block.subscriptions)` creates emission steps inside an acquired test fixture. For private registries, test the checked implementation that owns them.

Qualify every testing step through the namespace so call sites such as `Story.given`, `Story.message`, and `Story.model` identify the DSL directly.

::Snippet{name="testingApi" label="API reference"}

### Match Commands by Definition or Instance

A Command matcher accepts either a Definition or an instance. A Definition matches the originating declaration, even after a Binding qualifies its displayed name. An instance also checks structurally equal arguments, and a bound instance selects its composition path.

Use `FetchWeather` when the test only cares that this Command was dispatched. Use `FetchWeather({ zipCode: '90210' })` when the placement and zip code are part of the contract. Do not compare `command.name` with a string or with `Definition.name`: different owners may declare the same local name, while a bound Command's displayed name includes its placement.

For before-and-after examples covering generated child delivery and completed UI Blocks, see [Migrate an existing test suite](/testing#migrate-an-existing-test-suite).

`Command.expectExact` compares an exact set without requiring dispatch order. Use `Command.expectExactInOrder` when order is part of the behavior, such as parent startup Commands followed by child init Commands. It keeps the same identity, argument, occurrence and exact-count checks. Neither assertion implies that effects run or complete in that order. Keep ordinary expectations in these helpers rather than inspecting simulation internals.

### Inspect Captured Command Arguments

Use a Command instance in an ordinary assertion when its arguments matter. `Command.argsOf(Definition)(pending)` is available for custom testing adapters that already own a pending invocation. It matches the Definition's source identity, including through qualified Binding paths, and returns `Option` of the Definition's exact args type. An argless match returns `Some(undefined)`; `None` means the pending Command came from another source.

Projection does not select an occurrence or change the invocation's parent Message mapping, Effect channels, qualified name or keys. It does not require a custom Story callback for an ordinary argument expectation.

::Snippet{name="testingCommandArgs" label="Inspect captured Command arguments"}

:::Info{label="Mount lifecycle is a Scene concern"}
Story does not render the view, so the OnMount lifecycle is not observable from a Story test. Tests that need to acknowledge mounts use Scene's `Mount.resolve` and the related steps; see the [Scene](/testing/scene) page.
:::

## Your First Test

Here’s a test for the delayed reset from the [Commands](/core/commands) page. Clicking reset starts a one-second delay. When the delay completes, the count returns to zero.

::Snippet{name="counterCommandsTest" label="Delayed-reset Story test"}

Read it from top to bottom. The Model starts at 5. `ClickedResetAfterDelay()` returns `WaitBeforeReset`. The test resolves that Command with `CompletedWaitBeforeReset()`, which update handles by setting the count to 0.

### Compare Models Without Mutable Captures

Use `models(steps(...), (before, after) => ...)` to compare the Models around a sequence. The callback receives the exact Model type, including when the sequence delivers a child Message or an InMessage. It can compare values or check that an unchanged child retains its reference. The runner retains the original reference; it does not clone the Model.

::Snippet{name="testingModelComparison" label="Compare Models around a transition"}

`story` returns its final Model after checking that every Command was resolved. A Block-aware Story returns an Effect containing that Model. An immutable result can seed a later Story or Scene with `given`; pending Commands and graph resources do not carry into that new test.

Do not assign Models into outer variables from an assertion callback. Use a comparison group, the returned Model or a deliberate immutable fixture. If those cannot express the scenario, check whether the test is asserting the right behavior or whether the DSL needs an operation for it.

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

Inside `withBlock`, use `Subscription.from(block.subscriptions)` to deliver a fact from that acquired graph. For private Subscription tests, select the implementation that owns the registry. The emitter accepts a registered entry and that entry's decoded Message. It applies the same generated child delivery used by Scene and the Runtime without starting a Stream or constructing its dependencies.

::Snippet{name="testingStorySubscription" label="Deliver a registered Subscription Message"}

Pass the raw child entry only when it identifies one registration. If a child Subscription appears at multiple placements, select the intended bound entry from the acquired executable's `subscriptions` record inside `withBlock`. The public contract does not reveal private lifecycle inventory. Keep those tests beside the implementation that owns the declarations.

### Resolve Child Commands

When resolving a Command from a [child Block](/core/block), pass the child's result Message. Story applies the parent Message mapping automatically.

Deliver a direct child fact with `Story.messageIn(Binding, message)`. For a descendant, supply a nonempty Binding path; each keyed segment is `{ binding, key }`. The runner checks the relationships and supplies the envelopes. Keep this step directly in the test unless a named concrete interaction makes the scenario clearer.

::Snippet{name="testingNestedChildMessage" label="Deliver a nested child Message"}

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
