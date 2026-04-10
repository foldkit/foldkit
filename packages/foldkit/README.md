<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/foldkit/foldkit/main/packages/website/public/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/foldkit/foldkit/main/packages/website/public/logo.svg">
    <img src="https://raw.githubusercontent.com/foldkit/foldkit/main/packages/website/public/logo.svg" alt="Foldkit" width="350">
  </picture>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/foldkit"><img src="https://img.shields.io/npm/v/foldkit" alt="npm version"></a>
</p>

<h3 align="center">The frontend framework for correctness.</h3>

<p align="center">
  <a href="https://foldkit.dev"><strong>Documentation</strong></a> · <a href="https://foldkit.dev/manifesto"><strong>Manifesto</strong></a> · <a href="https://foldkit.dev/example-apps"><strong>Examples</strong></a> · <a href="https://foldkit.dev/getting-started"><strong>Getting Started</strong></a>
</p>

---

Foldkit is a frontend framework for TypeScript, built on [Effect](https://effect.website/), using [The Elm Architecture](https://guide.elm-lang.org/architecture/). One Model, one update function, one way to do things. No hooks, no local state, no hidden mutations.

> [!NOTE]
> Foldkit is pre-1.0. The core API is stable, but breaking changes may occur in minor releases. See the [changelog](./CHANGELOG.md) for details.

## Who It's For

Foldkit is for developers who want their architecture to prevent bugs, not just catch them. If you want a single pattern that scales from a counter to a multiplayer game without complexity creep, this is it.

It's not incremental. There's no React interop, no escape hatch from Effect, no way to "just use hooks for this one part." You're all in or you're not.

## Built on Effect

Every Foldkit application is an [Effect](https://effect.website/) program. Your Model is a [Schema](https://effect.website/docs/schema/introduction/). Side effects are values you return, not callbacks you fire — the runtime handles when and how. If you already know Effect, Foldkit feels natural. If you're new to Effect, Foldkit is a great way to immerse yourself in it.

## Coming from React?

[Coming from React](https://foldkit.dev/coming-from-react) is a guided walk through the differences. [Foldkit vs React: Side by Side](https://foldkit.dev/foldkit-vs-react-side-by-side) implements the same pixel-art editor in both frameworks so you can read them line by line.

## Get Started

`create-foldkit-app` is the recommended way to start a new project. It scaffolds a complete setup with Tailwind, TypeScript, ESLint, Prettier, and the Vite plugin for state-preserving HMR — and lets you choose from a set of examples as your starting point.

```bash
npx create-foldkit-app@latest --wizard
```

## Counter

This is a complete Foldkit program. State lives in a single Model. Events become Messages. A pure function handles every transition.

```ts
import { Match as M, Schema as S } from 'effect'
import { Command, Runtime } from 'foldkit'
import { Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'

// MODEL

const Model = S.Struct({ count: S.Number })
type Model = typeof Model.Type

// MESSAGE

const ClickedDecrement = m('ClickedDecrement')
const ClickedIncrement = m('ClickedIncrement')
const ClickedReset = m('ClickedReset')

const Message = S.Union(ClickedDecrement, ClickedIncrement, ClickedReset)
type Message = typeof Message.Type

// UPDATE

const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      ClickedDecrement: () => [{ count: model.count - 1 }, []],
      ClickedIncrement: () => [{ count: model.count + 1 }, []],
      ClickedReset: () => [{ count: 0 }, []],
    }),
  )

// INIT

const init: Runtime.ProgramInit<Model, Message> = () => [{ count: 0 }, []]

// VIEW

const { div, button, Class, OnClick } = html<Message>()

const view = (model: Model): Html =>
  div(
    [
      Class(
        'min-h-screen bg-white flex flex-col items-center justify-center gap-6 p-6',
      ),
    ],
    [
      div(
        [Class('text-6xl font-bold text-gray-800')],
        [model.count.toString()],
      ),
      div(
        [Class('flex flex-wrap justify-center gap-4')],
        [
          button([OnClick(ClickedDecrement()), Class(buttonStyle)], ['-']),
          button([OnClick(ClickedReset()), Class(buttonStyle)], ['Reset']),
          button([OnClick(ClickedIncrement()), Class(buttonStyle)], ['+']),
        ],
      ),
    ],
  )

// STYLE

const buttonStyle = 'bg-black text-white hover:bg-gray-700 px-4 py-2 transition'

// RUN

const program = Runtime.makeProgram({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
})

Runtime.run(program)
```

Source: [examples/counter/src/main.ts](https://github.com/foldkit/foldkit/blob/main/examples/counter/src/main.ts)

## What Ships With Foldkit

Foldkit is a complete system, not a collection of libraries you stitch together.

- **Commands**: Side effects are named Effects that return Messages and are executed by the runtime. Define them with `Command.define`, passing the result Message schemas so the Effect's return type stays in lockstep with your Messages. Use any Effect combinator you want: retry, timeout, race, parallel. You write the Effect, the runtime runs it.
- **Routing**: Type-safe bidirectional routing built from parser combinators. URLs parse into typed Routes and Routes build back into URLs. No string matching, no mismatches between parsing and building.
- **Subscriptions**: Declare which streams your app needs as a function of the Model. The runtime diffs and switches them as the Model changes.
- **Managed Resources**: Model-driven lifecycle for long-lived browser resources like WebSockets, AudioContext, and RTCPeerConnection. Acquire on state change, release on cleanup.
- **Submodels**: A pattern for composing nested modules. A child owns its own Model, Messages, update function, and view; the parent embeds it and wraps child Messages in a `Got*Message` envelope. The pattern scales unchanged from a login form to a multi-page app.
- **OutMessage**: A typed channel for a child Submodel to emit domain events up to its parent, so the parent reacts to meaningful facts instead of internal child Messages.
- **UI Components**: Accessible, keyboard-friendly primitives covering Button, Checkbox, Combobox, Dialog, Disclosure, DragAndDrop, Fieldset, Input, Listbox, Menu, Popover, RadioGroup, Select, Switch, Tabs, Textarea, and Transition. Every component is a Submodel with a typed `ViewConfig`, domain-event callbacks like `onSelected`, `onClosed`, and `onToggled`, and `className` plus `attributes` props on every slot for styling and extension. Animated components share a `Transition` Submodel that coordinates CSS enter and leave animations.
- **Field Validation**: Per-field validation state modeled as a discriminated union. Define rules as data, apply them in update, and the Model tracks the result.
- **Virtual DOM**: Declarative views powered by [Snabbdom](https://github.com/snabbdom/snabbdom), with lazy memoization and fast, keyed diffing. Views are plain functions of your Model.
- **DevTools**: Built-in overlay for inspecting Messages, Model state, and Commands. Time-travel mode lets you jump to any point in history, Inspect mode browses snapshots without pausing, and Submodel drill-in filtering scopes the Message list to any nested module.
- **Crash View and Reporting**: Configure `crash.view` to render a custom fallback UI when the update loop throws. A `crash.report` callback fires first with the error, Model, and triggering Message, so you can ship it straight to Sentry or your logger.
- **Story Testing**: Exercise the update function directly. Send Messages, resolve Commands inline with `resolve` and `resolveAll`, and assert with focused helpers: `Story.model`, `Story.expectHasCommands`, `Story.expectExactCommands`, `Story.expectNoCommands`, and `Story.expectOutMessage`. No mocking libraries, no fake timers.
- **Scene Testing**: Drive your app the way a user does. Scene renders your real view, then clicks buttons, types into inputs, presses keys, and asserts on what's on screen. Accessible locators (`role`, `label`, `placeholder`, `altText`, `title`, `testId`, `displayValue`) with full options (`name`, `level`, `checked`, `selected`, `pressed`, `expanded`, `disabled`), multi-match `Scene.all` with `Scene.filter` and `Scene.nth`, scoped steps via `Scene.inside`, pointer events, event bubbling, and Vitest matchers like `toHaveText`, `toBeVisible`, `toHaveAccessibleName`, and `toHaveCount`. API parity with React Testing Library and Playwright, without a browser.
- **Slow-View Monitoring**: Wire `slowView` on `makeProgram` to catch renders that exceed a threshold you set. The callback fires with the current Model, the triggering Message, and the render duration, so you can log it, sample it, or ship it to your observability tool.
- **HMR**: Vite plugin with state-preserving hot module replacement. Change your view, keep your state.

## Correctness You (And Your LLM) Can See

Every state change flows through one update function. Every side effect is declared explicitly — in Commands, Subscription streams, and Managed Resource lifecycles. You don't have to hold a mental model of what runs when — you can point at it.

This is what makes Foldkit unusually AI-friendly. The same property that makes the code easy for humans to reason about makes it easy for LLMs to generate and review. The architecture makes correctness visible, whether the reader is a person or an LLM.

## Examples

- **[Counter](https://foldkit.dev/example-apps/counter)** — Increment/decrement with reset
- **[Todo](https://foldkit.dev/example-apps/todo)** — CRUD operations with localStorage persistence
- **[Stopwatch](https://foldkit.dev/example-apps/stopwatch)** — Timer with start/stop/reset
- **[Crash View](https://foldkit.dev/example-apps/crash-view)** — Custom crash fallback UI with crash reporting
- **[Form](https://foldkit.dev/example-apps/form)** — Form validation with async email checking
- **[Weather](https://foldkit.dev/example-apps/weather)** — HTTP requests with async state handling
- **[Routing](https://foldkit.dev/example-apps/routing)** — URL routing with parser combinators
- **[Query Sync](https://foldkit.dev/example-apps/query-sync)** — URL query parameter sync with filtering and sorting
- **[Snake](https://foldkit.dev/example-apps/snake)** — Classic game built with Subscriptions
- **[Auth](https://foldkit.dev/example-apps/auth)** — Authentication flow with Submodels and OutMessage
- **[Shopping Cart](https://foldkit.dev/example-apps/shopping-cart)** — Nested models and complex state
- **[WebSocket Chat](https://foldkit.dev/example-apps/websocket-chat)** — Managed Resources with WebSocket integration
- **[Kanban](https://foldkit.dev/example-apps/kanban)** — Drag-and-drop kanban board with cross-column reordering and keyboard navigation
- **[Pixel Art](https://foldkit.dev/example-apps/pixel-art)** — Grid-based pixel editor with painting, erasing, and palette selection
- **[UI Showcase](https://foldkit.dev/example-apps/ui-showcase)** — Interactive showcase of every Foldkit UI component
- **[Typing Game](https://github.com/foldkit/foldkit/tree/main/packages/typing-game)** — Multiplayer typing game with Effect RPC backend ([play it live](https://typingterminal.com))

## License

MIT
