# Story

## Testing the Update Loop

`Story` calls update with the Model and Messages you provide. Commands stay as data until the test supplies their result Messages. You can test a complete state transition without a DOM, a timer, or a running Effect.

The entire test is one `story` call. Start from a Model, send a Message, resolve any Commands, and assert on the next Model.

## The API

Import the steps you need from `foldkit/story`.

- Top-level steps start the test, group reusable setup, send Messages, and inspect results: `story`, `steps`, `given`, `message`, `model`, `expectOutMessage`, and `expectNoOutMessage`.
- The `Command` namespace handles pending Commands: `resolve`, `resolveAll`, `resolveAllExact`, `expectHas`, `expectExact`, and `expectNone`.

Use named imports when the file contains only Story tests. If a file contains both Story and Scene tests, import the namespaces from `foldkit` so `Story.given` and `Scene.given` stay distinct.

::Snippet{name="testingApi" label="API reference"}

A Command matcher accepts either a Definition or an instance. A Definition matches by name. An instance also checks structurally equal arguments.

Use `FetchWeather` when the test only cares that the Command was dispatched. Use `FetchWeather({ zipCode: '90210' })` when the zip code is part of the contract.

:::Info{label="Mount lifecycle is a Scene concern"}
Story does not render the view, so the OnMount lifecycle is not observable from a Story test. Tests that need to acknowledge mounts use Scene's `Mount.resolve` and the related steps; see the [Scene](/testing/scene) page.
:::

## Your First Test

Here’s a test for the delayed reset from the [Commands](/core/commands) page. Clicking reset starts a one-second delay. When the delay completes, the count returns to zero.

::Snippet{name="counterCommandsTest" label="simple test example"}

Read it from top to bottom. The Model starts at 5. `ClickedResetAfterDelay()` returns `DelayReset`. The test resolves that Command with `CompletedDelayReset()`, which update handles by setting the count to 0.

## Multi-Step Flows

Keep each Command result next to the Message that caused it. `Command.resolve`, `Command.resolveAll`, and `Command.resolveAllExact` let a longer test stay chronological:

::Snippet{name="testingWeatherFlow" label="multi-step test example"}

The test does not run an HTTP request. It declares that `FetchWeather` succeeded, feeds the resulting Message through update, and checks the Model that the view will render.

:::Info{label="Resolvers are a queue"}
Each `resolveAll` entry resolves one matching dispatch in declaration order. Three `[FetchCount, message]` entries resolve three `FetchCount` dispatches. For N identical responses, use `Array.makeBy(n, () => [Definition, message])`.

Unused resolvers can match later dispatches. A new resolver replaces any leftover resolver with the same Definition or instance shape.
:::

:::Info{label="Exact resolution"}
Use `resolveAllExact` when the resolver list is also a claim about which Commands were dispatched. It walks cascades like `resolveAll`, but every listed entry must match one dispatch within that call and no actual Command may remain unresolved. Repeated entries sharing a Definition consume repeated dispatches in declaration order. Supplied resolvers never carry forward.
:::

:::Info{label="Unresolved Commands"}
`message` throws if there are pending Commands from a previous step. Resolve all Commands before sending the next Message. `story` throws at the end if any Commands remain unresolved. Every Command your update function produces must be accounted for.
:::

## Reusable Step Groups

Use `steps` when several stories share the same setup or Message sequence. The group preserves the Model, Message, and OutMessage constraints of every step inside it, so the update passed to `story` still rejects a group built for a different program.

::Snippet{name="testingReusableSteps" label="reusable Story steps"}

A group can contain any step accepted by `story`, including `given`, `message`, Model assertions, Command steps, OutMessage assertions, and another `steps` group. `story` runs the group in declaration order at the position where it appears.

Do not use Effect's `flow` to group Story steps. Message and OutMessage steps are typed data, not functions, and `steps` is the boundary that preserves their types. This does not replace `flow` for ordinary function composition elsewhere in an application.

## Testing Side Effects

Story tests the state machine. It does not run the Effect inside a Command.

To test that a Command’s Effect works correctly (for example, that an HTTP request parses the response right), test it separately with `Effect.provide` and a mock service layer:

::Snippet{name="testingCommandEffect" label="Command Effect test example"}

The two tests cover different contracts. Story checks which Command update returns and what update does with its result Message. The Effect test checks the work the Command executes.
