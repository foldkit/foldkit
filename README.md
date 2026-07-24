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

<h3 align="center">The frontend framework for correctness.</h3>

<p align="center">
  <a href="https://foldkit.dev"><strong>Documentation</strong></a> · <a href="https://foldkit.dev/get-started/manifesto"><strong>Manifesto</strong></a> · <a href="https://foldkit.dev/example-apps"><strong>Examples</strong></a> · <a href="https://foldkit.dev/get-started/getting-started"><strong>Getting Started</strong></a> · <a href="https://discord.gg/kav8VNxqGm"><strong>Discord</strong></a>
</p>

---

Foldkit is a TypeScript frontend framework built on [Effect](https://effect.website/) and architected like [Elm](https://guide.elm-lang.org/architecture/). One Model, one update function, one way to do things. No hooks, no local state, no hidden mutations. It's all in on Effect with no escape hatch, though a program doesn't have to own the whole page: [`Runtime.embed`](https://foldkit.dev/core/embedding) runs a Foldkit widget inside any existing app, React included.

Your Model is a [Schema](https://effect.website/docs/schema/introduction/) and side effects are values you return, not callbacks you fire. If you know Effect, Foldkit feels natural. If you're new to it, Foldkit is a good way in. Coming from React? [Start here](https://foldkit.dev/react/coming-from-react), or read the [same pixel-art editor built in both frameworks](https://foldkit.dev/react/foldkit-vs-react-side-by-side).

> [!NOTE]
> Foldkit is pre-1.0. The core API is stable, but breaking changes may occur in minor releases. See the [changelog](./packages/foldkit/CHANGELOG.md) for details.

## Get Started

`create-foldkit-app` scaffolds a complete setup with Tailwind, TypeScript, [Oxlint](https://foldkit.dev/tooling/oxlint-plugin), Prettier, and the Vite plugin for state-preserving HMR, starting from an example you choose.

```bash
npx create-foldkit-app@latest
```

## Counter

A complete Foldkit program. State lives in a single Model, events become Messages, and a pure function handles every transition. `main.ts` defines the program and `entry.ts` boots the runtime, so `main.ts` stays importable from tests without booting a runtime as a side effect.

```ts
// src/main.ts
import { Match as M, Schema as S } from 'effect'
import { Command, Runtime } from 'foldkit'
import { Document, html } from 'foldkit/html'
import { m } from 'foldkit/message'

// MODEL

export const Model = S.Struct({ count: S.Number })
export type Model = typeof Model.Type

// MESSAGE

const ClickedDecrement = m('ClickedDecrement')
const ClickedIncrement = m('ClickedIncrement')
const ClickedReset = m('ClickedReset')

export const Message = S.Union([
  ClickedDecrement,
  ClickedIncrement,
  ClickedReset,
])
export type Message = typeof Message.Type

// UPDATE

export const update = (
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

export const init: Runtime.ApplicationInit<Model, Message> = () => [
  { count: 0 },
  [],
]

// VIEW

export const view = (model: Model): Document => {
  const h = html<Message>()

  return {
    title: `Counter: ${model.count}`,
    body: h.div(
      [],
      [
        h.p([], [model.count.toString()]),
        h.button([h.OnClick(ClickedDecrement())], ['-']),
        h.button([h.OnClick(ClickedReset())], ['Reset']),
        h.button([h.OnClick(ClickedIncrement())], ['+']),
      ],
    ),
  }
}
```

```ts
// src/entry.ts
import { Runtime } from 'foldkit'

import { Model, init, update, view } from './main'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
})

Runtime.run(application)
```

Source: [examples/counter](https://github.com/foldkit/foldkit/blob/main/examples/counter/src/main.ts).

## What Ships With Foldkit

A complete system, not a collection of libraries you stitch together. Each of these is documented in depth at [foldkit.dev](https://foldkit.dev).

- **Commands**: Side effects as named Effects that return Messages and are run by the runtime.
- **Routing**: Type-safe bidirectional routing from parser combinators. URLs parse to Routes, Routes build URLs.
- **Subscriptions**: External event streams declared as a function of the Model.
- **Managed Resources**: Model-driven lifecycle for WebSockets, AudioContext, and other long-lived handles.
- **Mount**: The seam where view code hands a real DOM element to a third-party library that owns its own DOM.
- **Submodels**: A self-contained Model, update, and view that a parent embeds, wrapping child Messages in a `Got*` envelope.
- **OutMessage**: A typed channel for a child Submodel to emit domain events up to its parent.
- **Embedding**: Run a Foldkit program inside a host app through Schema-typed Ports with `Runtime.embed`.
- **UI Components**: Accessible, keyboard-friendly primitives in the `@foldkit/ui` package.
- **Field Validation**: Per-field validation state modeled as a discriminated union.
- **Virtual DOM**: Declarative views with lazy memoization and keyed diffing, powered by [Snabbdom](https://github.com/snabbdom/snabbdom).
- **DevTools**: In-browser overlay for inspecting Messages, Model, and Commands, with time-travel.
- **DevTools MCP**: Expose a running app to AI agents over the Model Context Protocol.
- **Crash View and Reporting**: A custom fallback UI when the update loop throws, plus a report callback.
- **Story Testing**: Exercise the update function directly, resolving Commands inline. No mocks, no fake timers.
- **Scene Testing**: Drive your real view the way a user does, with accessible locators. No browser required.
- **Slow Warnings**: Development warnings when update, view, patch, or Subscription extraction exceeds its budget.
- **HMR**: Vite plugin with state-preserving hot module replacement. Change your view, keep your state.

## Correctness You (And Your LLM) Can See

Every state change flows through one update function, and every side effect is declared explicitly. You don't have to hold a mental model of what runs when, you can point at it. That's what makes Foldkit unusually AI-friendly: the property that makes the code easy for humans to reason about makes it easy for an LLM to generate and review.

## Examples

Some of what you can build with Foldkit. [See all example apps on foldkit.dev](https://foldkit.dev/example-apps).

- **[Counter](https://foldkit.dev/example-apps/counter)**: Increment/decrement with reset
- **[Todo](https://foldkit.dev/example-apps/todo)**: CRUD operations with localStorage persistence
- **[Form](https://foldkit.dev/example-apps/form)**: Form validation with async email checking
- **[Job Application](https://foldkit.dev/example-apps/job-application)**: Multi-step form with cross-field validation, file uploads, and per-step error indicators
- **[Weather](https://foldkit.dev/example-apps/weather)**: HTTP requests with async state handling
- **[API Cache](https://foldkit.dev/example-apps/api-cache)**: Query caching with stale-while-revalidate, request deduplication, and interval refetching
- **[Routing](https://foldkit.dev/example-apps/routing)**: URL routing with parser combinators
- **[Route Transitions](https://foldkit.dev/example-apps/route-transitions)**: Live transition log with entry, exit, and stayed navigation policies
- **[Query Sync](https://foldkit.dev/example-apps/query-sync)**: URL query parameter sync with filtering and sorting
- **[Snake](https://foldkit.dev/example-apps/snake)**: Classic game built with Subscriptions
- **[Auth](https://foldkit.dev/example-apps/auth)**: Authentication flow with Submodels and OutMessage
- **[Shopping Cart](https://foldkit.dev/example-apps/shopping-cart)**: Nested models and complex state
- **[WebSocket Chat](https://foldkit.dev/example-apps/websocket-chat)**: Managed Resources with WebSocket integration
- **[Kanban](https://foldkit.dev/example-apps/kanban)**: Drag-and-drop kanban board with cross-column reordering and keyboard navigation
- **[Pixel Art](https://foldkit.dev/example-apps/pixel-art)**: Grid-based pixel editor with painting, erasing, and palette selection
- **[UI Showcase](https://foldkit.dev/example-apps/ui-showcase)**: Interactive showcase of every Foldkit UI component
- **[Typing Game](packages/typing-game)**: Multiplayer typing game with Effect RPC backend ([play it live](https://typingterminal.com))

## Development

```bash
git clone https://github.com/foldkit/foldkit.git
cd foldkit
pnpm install

# Build the Foldkit libraries in watch mode
pnpm dev:libs

# Run an example (in a separate terminal)
pnpm dev:example:counter
```

External reference repositories under `repos/` are vendored in as git subtrees, so they come down with the clone. Each is pinned to the release tag matching the version this repo depends on, not a moving branch, so the reference source always matches what installs and compiles. Refresh `repos/effect` from the `effect@<version>` tag that matches `package.json`, and re-pin it whenever the `effect` dependency is bumped:

```bash
VER=$(node -p "require('./packages/foldkit/package.json').devDependencies.effect")
git subtree pull --prefix=repos/effect https://github.com/Effect-TS/effect.git "effect@${VER}" --squash
```

## License

MIT
