<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="packages/website/public/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="packages/website/public/logo.svg">
    <img src="packages/website/public/logo.svg" alt="Foldkit" width="350">
  </picture>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/foldkit"><img src="https://img.shields.io/npm/v/foldkit" alt="npm version"></a>
</p>

<h3 align="center">Beautifully boring frontend applications.</h3>

<p align="center">
  <a href="https://foldkit.dev"><strong>Documentation</strong></a> · <a href="#examples"><strong>Examples</strong></a> · <a href="https://foldkit.dev/getting-started"><strong>Getting Started</strong></a>
</p>

---

Foldkit is an [Elm Architecture](https://guide.elm-lang.org/architecture/) framework for TypeScript, powered by [Effect](https://effect.website/). One model, one update function, one way to do things. No hooks, no local state, no hidden mutations.

> [!WARNING]
> Foldkit is pre-1.0. APIs may change between minor versions.

## Who It's For

Foldkit is for developers who want their architecture to prevent bugs, not just catch them. If you want a single pattern that scales from a counter to a multiplayer game without complexity creep, this is it.

It's not incremental. There's no React interop, no escape hatch from Effect, no way to "just use hooks for this one part." You're all in or you're not.

## Built on Effect

Every Foldkit application is an [Effect](https://effect.website/) program. Your model is a [Schema](https://effect.website/docs/schema/introduction/). Your side effects are Effects that produce messages. The runtime manages fibers, interruption, and error recovery — you describe what should happen and Effect handles the rest.

## Get Started

```bash
npx create-foldkit-app@latest --wizard
```

## Counter

This is a complete Foldkit program. State lives in a single model. Events become messages. A pure function handles every transition.

```ts
import { Match as M, Schema } from 'effect'
import { Runtime } from 'foldkit'
import { Command } from 'foldkit/command'
import { Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'

// MODEL

const Model = Schema.Number
type Model = typeof Model.Type

// MESSAGE

const ClickedDecrement = m('ClickedDecrement')
const ClickedIncrement = m('ClickedIncrement')
const ClickedReset = m('ClickedReset')

const Message = Schema.Union(ClickedDecrement, ClickedIncrement, ClickedReset)
export type Message = typeof Message.Type

// UPDATE

const update = (
  count: Model,
  message: Message,
): [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({
      ClickedDecrement: () => [count - 1, []],
      ClickedIncrement: () => [count + 1, []],
      ClickedReset: () => [0, []],
    }),
  )

// INIT

const init: Runtime.ElementInit<Model, Message> = () => [0, []]

// VIEW

const { div, button, Class, OnClick } = html<Message>()

const view = (count: Model): Html =>
  div(
    [
      Class(
        'min-h-screen bg-white flex flex-col items-center justify-center gap-6 p-6',
      ),
    ],
    [
      div([Class('text-6xl font-bold text-gray-800')], [count.toString()]),
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

const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
})

Runtime.run(element)
```

Source: [examples/counter/src/main.ts](https://github.com/devinjameson/foldkit/blob/main/examples/counter/src/main.ts)

## What Ships With Foldkit

Foldkit is a complete system, not a collection of libraries you stitch together.

- **Side Effects** — Side effects are described as Effects that return messages and are executed by the runtime. Use any Effect combinator you want — retry, timeout, race, parallel. You write the Effect, the runtime runs it.
- **Routing** — Type-safe bidirectional routing. URLs parse into typed routes and routes build back into URLs. No string matching, no runtime surprises.
- **Subscriptions** — Declare which streams your app needs as a function of the model. The runtime diffs and switches them when the model changes.
- **Managed Resources** — Model-driven lifecycle for long-lived browser resources like WebSockets, AudioContext, and RTCPeerConnection. Acquire on state change, release on cleanup.
- **UI Components** — Dialog, menu, tabs, listbox, disclosure — accessible primitives built for the Elm Architecture.
- **Field Validation** — Schema-driven validation with per-field error states. Validation rules live in your model, not scattered across event handlers.
- **Virtual DOM** — Declarative views powered by [Snabbdom](https://github.com/snabbdom/snabbdom). Fast, keyed diffing. Views are plain functions of your model.
- **HMR** — Vite plugin with state-preserving hot module replacement. Change your view, keep your state.

## Correctness You Can See

Every state change and every side effect lives in the update function. You don't have to hold a mental model of what runs when — you can point at it.

This is what makes Foldkit unusually AI-friendly. The same property that makes the code easy for humans to reason about makes it easy for LLMs to generate and review. The architecture makes correctness visible, whether the reader is a person or a model.

## Examples

- **[Counter](examples/counter/src/main.ts)** — Increment/decrement with reset
- **[Stopwatch](examples/stopwatch/src/main.ts)** — Timer with start/stop/reset
- **[Weather](examples/weather/src/main.ts)** — HTTP requests with async state handling
- **[Todo](examples/todo/src/main.ts)** — CRUD operations with localStorage persistence
- **[Form](examples/form/src/main.ts)** — Form validation with async email checking
- **[Routing](examples/routing/src/main.ts)** — URL routing with parser combinators
- **[Shopping Cart](examples/shopping-cart/src/main.ts)** — Nested models and complex state
- **[Snake](examples/snake/src/main.ts)** — Classic game built with subscriptions
- **[WebSocket Chat](examples/websocket-chat/src/main.ts)** — Managed resources with WebSocket integration
- **[Auth](examples/auth/src/main.ts)** — Authentication flow with model-as-union
- **[Query Sync](examples/query-sync/src/main.ts)** — URL query parameter sync with filtering and sorting
- **[Error View](examples/error-view/src/main.ts)** — Custom error fallback UI
- **[Typing Game](packages/typing-game)** — Multiplayer typing game with Effect RPC backend

## Development

```bash
git clone https://github.com/devinjameson/foldkit.git
cd foldkit
pnpm install

# Build Foldkit in watch mode
pnpm dev:core

# Run an example (in a separate terminal)
pnpm dev:example:counter
```

## License

MIT
