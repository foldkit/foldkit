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

<h3 align="center">Build faster. Understand what ships.</h3>

<p align="center">
  <a href="https://foldkit.dev"><strong>Documentation</strong></a> · <a href="https://foldkit.dev/introduction/why-foldkit"><strong>Why Foldkit</strong></a> · <a href="https://foldkit.dev/example-apps"><strong>Examples</strong></a> · <a href="https://foldkit.dev/get-started"><strong>Get Started</strong></a> · <a href="https://discord.gg/kav8VNxqGm"><strong>Discord</strong></a>
</p>

---

Foldkit is a TypeScript frontend framework built on [Effect](https://effect.website/). It gives your entire application one architecture: a [Schema](https://effect.website/docs/schema/introduction/)-defined Model as the single source of truth, fact-named Messages, an exhaustive update function, and explicit Commands for side effects. Routing, server rendering, UI components, Blocks, and browser lifecycles all use that same Model and Message flow.

Foldkit uses [The Elm Architecture](https://guide.elm-lang.org/architecture/) instead of component-owned state and hook lifecycles. That discipline is a real commitment. Foldkit works best when the team wants shared conventions across the application and is ready to build on Effect throughout. If your backend already uses Effect, Foldkit carries the same tools and patterns into the browser: Schema, services, Streams, and scoped resources.

Each feature declares the effects it needs and bundles their handlers in [Effect Layers](https://foldkit.dev/core/layers). At the application root, compose those bundles with their required services. TypeScript checks that the requirements are satisfied before the application can run. Tests can provide controlled services while running the same effect handlers.

A Foldkit program can own the whole page or run as a widget inside an existing application, React included, through [`Runtime.embed`](https://foldkit.dev/core/embedding). The same program can [render on the server](https://foldkit.dev/core/server-rendering) at build time or per request, then hydrate in place. Coming from React? [Start here](https://foldkit.dev/react/coming-from-react), or compare the [same pixel-art editor built in both frameworks](https://foldkit.dev/react/foldkit-vs-react-side-by-side).

> [!NOTE]
> Foldkit is in beta and under active development. The core API is stable, but breaking changes may occur in minor releases. See the [changelog](./CHANGELOG.md) for details.

## Get Started

`create-foldkit-app` scaffolds a complete setup with Tailwind, TypeScript, [Oxlint](https://foldkit.dev/tooling/oxlint-plugin), Oxfmt, and the Vite plugin for state-preserving live reload. Pick a rendering mode (browser-only SPA, static generation, or server rendering) and, for a SPA, the example to start from.

```bash
npx create-foldkit-app@latest
```

## Counter

A complete Foldkit program. State lives in a single Model, events become Messages, and a pure function handles every transition. `application.ts` exports `ApplicationComposition`, `ApplicationBlock`, and its implementation. `entry.ts` supplies the browser container and boots the Runtime, so importing the application from a test has no startup side effect.

```ts
// src/application.ts
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const Model = Schema.Struct({ count: Schema.Number })
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedDecrement: {},
  ClickedIncrement: {},
  ClickedReset: {},
})
export type Message = typeof Message.Type

export const ApplicationComposition = Block.makeDefinition('Application', {
  Model,
  Message,
}).makeComposition()

export const update = ApplicationComposition.makeUpdate({
  ClickedDecrement: model => ({
    model: modifyFields(model, { count: count => count - 1 }),
  }),
  ClickedIncrement: model => ({
    model: modifyFields(model, { count: count => count + 1 }),
  }),
  ClickedReset: model => ({ model: modifyFields(model, { count: () => 0 }) }),
})

export const init = ApplicationComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))

export const view = ApplicationComposition.makeView((model, h) => ({
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
}))

const prepare = () =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    view,
  })
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
```

```ts
// src/entry.ts
import { Program, Runtime } from 'foldkit'

import { ApplicationBlock } from './application'

const program = Program.make({
  block: ApplicationBlock,
  container: document.getElementById('root'),
})

Runtime.run(program)
```

The root is an ordinary Block. `Block.makeDefinition('Application', ...)` owns effect constructors, Steps, lifecycle definitions, and child Bindings. Retain that result as `ApplicationDefinition` when those authoring methods use it. This graphless application chains the top-level factory directly into `makeComposition()` and names the result `ApplicationComposition`. Author init, update, and the primary view through that Composition. Call `prepareBlock` inside the private `prepare` function, then assemble `ApplicationBlock` with its matching `FromAssembly` annotation and `Block.assemble(prepare)`. The explicit Model Schema in that annotation reduces the inference work needed when a parent Schema reads the Block's `Model`. Pass root-owned handler recipes to `prepareBlock` as `EffectsLayer`.

A feature follows the same passive Definition → Composition → assembly sequence. Create `FeatureDefinition` with `Block.makeDefinition('Feature', { Model, Message, OutMessage })` and author effects and Steps through that Definition. Name `FeatureComposition = FeatureDefinition.makeComposition({ bindings, mounts })`, using `FeatureDefinition.makeComposition()` for an empty graph, then author init, update, and the primary view. Prepare and assemble the completed `FeatureBlock` using the checked pattern above. A parent imports that Block, creates a Binding with `const FeatureBinding = ParentDefinition.makeBinding(FeatureBlock, config)`, and includes that Binding in its Composition's child graph. Only the Runtime starts the assembled program.

When local view helpers need the Composition's exact builder capabilities, declare `type FeatureViewBuilder = Block.ViewBuilderFor<typeof FeatureComposition>` immediately after the Composition and export it only for cross-file use. The owner prefix identifies that specific Composition; structural contracts keep the standard `Model`, `Message`, and `OutMessage` names and normally travel through the feature namespace.

Ordinary Effect services stay in `ApplicationLayer`. Keep a small provider composition in `entry.ts`, and extract `layer.ts` only when it is substantial or reused. Supply that Layer after the Program is complete:

```ts
Runtime.run(program.provide(ApplicationLayer))
```

`program.provide(ApplicationLayer)` returns another passive program. The Runtime builds the Layer only when it starts that program.

Source: [examples/counter](https://github.com/foldkit/foldkit/blob/main/examples/counter/src/application.ts).

## What Ships With Foldkit

Routing, server rendering, UI components, composition, and browser lifecycles all use the same Model and Message flow. The pieces below ship as one system and are documented in depth at [foldkit.dev](https://foldkit.dev).

- **Commands**: Side effects as named Effects that return Messages and are run by the Runtime.
- **Routing**: Type-safe bidirectional routing from parser combinators. URLs parse to Routes, Routes build URLs.
- **Subscriptions**: External event streams declared as a function of the Model.
- **Managed Resources**: Model-driven lifecycle for WebSockets, AudioContext, and other long-lived handles.
- **Mount**: The seam where view code hands a real DOM element to a third-party library that owns its own DOM.
- **Blocks**: A self-contained Model, update, and view connected to a parent through parent-owned child Bindings.
- **OutMessage**: A typed channel for a child Block to emit domain events up to its parent.
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
- **Live Reload**: Vite plugin with state-preserving reloads. Save a file, the page reloads, and your Model is restored. Change your view, keep your state.

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
- **[API Cache Query](https://foldkit.dev/example-apps/api-cache-query)**: The same app with experimental `Query.define` owning fetch and keyed slots
- **[Routing](https://foldkit.dev/example-apps/routing)**: URL routing with parser combinators
- **[Route Transitions](https://foldkit.dev/example-apps/route-transitions)**: Live transition log with entry, exit, and stayed navigation policies
- **[Query Sync](https://foldkit.dev/example-apps/query-sync)**: URL query parameter sync with filtering and sorting
- **[Snake](https://foldkit.dev/example-apps/snake)**: Classic game built with Subscriptions
- **[Auth](https://foldkit.dev/example-apps/auth)**: Authentication flow with Blocks and OutMessage
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
