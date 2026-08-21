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
  <a href="https://foldkit.dev"><strong>Documentation</strong></a> · <a href="https://foldkit.dev/get-started/manifesto"><strong>Manifesto</strong></a> · <a href="https://foldkit.dev/example-apps"><strong>Examples</strong></a> · <a href="https://foldkit.dev/get-started/getting-started"><strong>Getting Started</strong></a> · <a href="https://discord.gg/kav8VNxqGm"><strong>Discord</strong></a>
</p>

---

Foldkit is a TypeScript frontend framework built on [Effect](https://effect.website/). It gives your entire application one architecture: a [Schema](https://effect.website/docs/schema/introduction/)-defined Model as the single source of truth, fact-named Messages, an exhaustive update function, and explicit Commands for side effects. Routing, server rendering, UI components, Submodels, and browser lifecycles all use that same Model and Message flow.

Foldkit uses [The Elm Architecture](https://guide.elm-lang.org/architecture/) instead of component-owned state and hook lifecycles. That discipline is a real commitment. Foldkit works best when the team wants shared conventions across the application and is ready to build on Effect throughout. If your backend already uses Effect, Foldkit carries the same tools and patterns into the browser: Schema, services, Streams, and scoped resources.

A Foldkit program can own the whole page or run as a widget inside an existing application, React included, through [`Runtime.embed`](https://foldkit.dev/core/embedding). The same program can [render on the server](https://foldkit.dev/core/server-rendering) at build time or per request, then hydrate in place. Coming from React? [Start here](https://foldkit.dev/react/coming-from-react), or compare the [same pixel-art editor built in both frameworks](https://foldkit.dev/react/foldkit-vs-react-side-by-side).

> [!NOTE]
> Foldkit is in beta and under active development. The core API is stable, but breaking changes may occur in minor releases. See the [changelog](./CHANGELOG.md) for details.

## Get Started

`create-foldkit-app` scaffolds a complete setup with Tailwind, TypeScript, [Oxlint](https://foldkit.dev/tooling/oxlint-plugin), Prettier, and the Vite plugin for state-preserving HMR. Pick a rendering mode (browser-only SPA, static generation, or server rendering) and, for a SPA, the example to start from.

```bash
npx create-foldkit-app@latest
```

## Counter

A complete Foldkit program. State lives in a single Model, events become Messages, and a pure function handles every transition. `main.ts` defines the program and `entry.ts` boots the Runtime, so `main.ts` stays importable from tests without booting a Runtime as a side effect.

```ts
// src/main.ts
import { Schema as S } from 'effect'
import { Runtime, Update } from 'foldkit'
import { Document, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// MODEL

export const Model = S.Struct({ count: S.Number })
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedDecrement: {},
  ClickedIncrement: {},
  ClickedReset: {},
})
export type Message = typeof Message.Type

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedDecrement: () => ({
      model: evo(model, { count: count => count - 1 }),
    }),
    ClickedIncrement: () => ({
      model: evo(model, { count: count => count + 1 }),
    }),
    ClickedReset: () => ({ model: evo(model, { count: () => 0 }) }),
  })

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: { count: 0 },
})

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: `Counter: ${model.count}`,
  body: h.div(
    [],
    [
      h.p([], [model.count.toString()]),
      h.button([h.OnClick(Message.ClickedDecrement())], ['-']),
      h.button([h.OnClick(Message.ClickedReset())], ['Reset']),
      h.button([h.OnClick(Message.ClickedIncrement())], ['+']),
    ],
  ),
})
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

Routing, server rendering, UI components, composition, and browser lifecycles all use the same Model and Message flow. The pieces below ship as one system and are documented in depth at [foldkit.dev](https://foldkit.dev).

- **Commands**: Side effects as named Effects that return Messages and are run by the Runtime.
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
- **Server Rendering**: The same program rendered to HTML at build time (SSG) or per request (SSR), then hydrated in place.
- **DevTools**: In-browser overlay for inspecting Messages, Model, and Commands, with time-travel.
- **DevTools MCP**: Expose a running app to AI agents over the Model Context Protocol.
- **Crash View and Reporting**: A custom fallback UI when the update loop throws, plus a report callback.
- **Story Testing**: Exercise the update function directly, resolving Commands inline. No mocks, no fake timers.
- **Scene Testing**: Drive your real view the way a user does, with accessible locators. No browser required.
- **Slow Warnings**: Development warnings when update, view, patch, or Subscription extraction exceeds its budget.
- **HMR**: Vite plugin with state-preserving hot module replacement. Change your view, keep your state.

## AI-Assisted Development

Every feature has the same visible structure: a Schema-defined Model, fact-named Messages, exhaustive update, and explicit Commands. AI-generated changes follow code paths a person can inspect and test. Foldkit DevTools and its MCP server expose the same Model and Message history while the application runs.

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
- **[Static Site Generation](https://foldkit.dev/example-apps/ssg)**: Build-time prerendering with client hydration
- **[Server-Side Rendering](https://foldkit.dev/example-apps/ssr)**: Per-request rendering on an Effect HttpServer with cookie-derived Flags
- **[Typing Game](https://github.com/foldkit/foldkit/tree/main/packages/typing-game)**: Multiplayer typing game with Effect RPC backend ([play it live](https://typingterminal.com))

## License

MIT
