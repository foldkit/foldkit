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

Foldkit is an [Elm Architecture](https://guide.elm-lang.org/architecture/) framework for TypeScript, powered by [Effect](https://effect.website/). One Model, one update function, one way to do things. No hooks, no local state, no hidden mutations.

> [!WARNING]
> Foldkit is pre-1.0. APIs may change between minor versions.

## Who It's For

Foldkit is for developers who want their architecture to prevent bugs, not just catch them. If you want a single pattern that scales from a counter to a multiplayer game without complexity creep, this is it.

It's not incremental. There's no React interop, no escape hatch from Effect, no way to "just use hooks for this one part." You're all in or you're not.

## Built on Effect

Every Foldkit application is an [Effect](https://effect.website/) program. Your Model is a [Schema](https://effect.website/docs/schema/introduction/). Side effects are values you return, not callbacks you fire — the runtime handles when and how. If you already know Effect, Foldkit feels natural. If you're new to Effect, Foldkit is a great way to immerse yourself in it.

## Get Started

`create-foldkit-app` is the recommended way to start a new project. It scaffolds a complete setup with Tailwind, TypeScript, ESLint, Prettier, and the Vite plugin for state-preserving HMR — and lets you choose from a set of examples as your starting point.

```bash
npx create-foldkit-app@latest --wizard
```

## Counter

This is a complete Foldkit program. State lives in a single Model. Events become Messages. A pure function handles every transition.

```ts
import { Match as M, Schema as S } from 'effect'
import { Runtime } from 'foldkit'
import { Command } from 'foldkit/command'
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
export type Message = typeof Message.Type

// UPDATE

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({
      ClickedDecrement: () => [{ count: model.count - 1 }, []],
      ClickedIncrement: () => [{ count: model.count + 1 }, []],
      ClickedReset: () => [{ count: 0 }, []],
    }),
  )

// INIT

const init: Runtime.ElementInit<Model, Message> = () => [{ count: 0 }, []]

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

- **Commands** — Side effects are described as Effects that return Messages and are executed by the runtime. Use any Effect combinator you want — retry, timeout, race, parallel. You write the Effect, the runtime runs it.
- **Routing** — Type-safe bidirectional routing. URLs parse into typed routes and routes build back into URLs. No string matching, no mismatches between parsing and building.
- **Subscriptions** — Declare which streams your app needs as a function of the Model. The runtime diffs and switches them when the Model changes.
- **Managed Resources** — Model-driven lifecycle for long-lived browser resources like WebSockets, AudioContext, and RTCPeerConnection. Acquire on state change, release on cleanup.
- **UI Components** — Dialog, menu, tabs, listbox, disclosure — fully accessible primitives that are easy to style and customize.
- **Field Validation** — Per-field validation state modeled as a discriminated union. Define rules as data, apply them in update, and the Model tracks the result.
- **Virtual DOM** — Declarative Views powered by [Snabbdom](https://github.com/snabbdom/snabbdom). Fast, keyed diffing. Views are plain functions of your Model.
- **HMR** — Vite plugin with state-preserving hot module replacement. Change your view, keep your state.

## Correctness You (And Your LLM) Can See

Every state change flows through one update function. Every side effect is declared explicitly — in Commands, Subscription streams, and Managed Resource lifecycles. You don't have to hold a mental model of what runs when — you can point at it.

This is what makes Foldkit unusually AI-friendly. The same property that makes the code easy for humans to reason about makes it easy for LLMs to generate and review. The architecture makes correctness visible, whether the reader is a person or an LLM.

## Examples

- **[Counter](examples/counter/src/main.ts)** — Increment/decrement with reset
- **[Stopwatch](examples/stopwatch/src/main.ts)** — Timer with start/stop/reset
- **[Weather](examples/weather/src/main.ts)** — HTTP requests with async state handling
- **[Todo](examples/todo/src/main.ts)** — CRUD operations with localStorage persistence
- **[Form](examples/form/src/main.ts)** — Form validation with async email checking
- **[Routing](examples/routing/src/main.ts)** — URL routing with parser combinators
- **[Shopping Cart](examples/shopping-cart/src/main.ts)** — Nested models and complex state
- **[Snake](examples/snake/src/main.ts)** — Classic game built with Subscriptions
- **[WebSocket Chat](examples/websocket-chat/src/main.ts)** — Managed Resources with WebSocket integration
- **[Auth](examples/auth/src/main.ts)** — Authentication flow with Submodels and OutMessage
- **[Query Sync](examples/query-sync/src/main.ts)** — URL query parameter sync with filtering and sorting
- **[Error View](examples/error-view/src/main.ts)** — Custom error fallback UI
- **[UI Showcase](examples/ui-showcase/src/main.ts)** — Interactive showcase of every Foldkit UI component
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
