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

<h3 align="center">Build faster. Understand what ships.</h3>

<p align="center">
  <a href="https://foldkit.dev"><strong>Documentation</strong></a> · <a href="https://foldkit.dev/introduction/why-foldkit"><strong>Why Foldkit</strong></a> · <a href="https://foldkit.dev/example-apps"><strong>Examples</strong></a> · <a href="https://foldkit.dev/get-started"><strong>Get Started</strong></a> · <a href="https://discord.gg/kav8VNxqGm"><strong>Discord</strong></a>
</p>

---

Foldkit is a TypeScript frontend framework built on [Effect](https://effect.website/). It makes state and side effects explicit, so your team and AI agents can build features, trace behavior, and test changes.

React, Vue, Svelte, and Solid solve rendering and leave the architecture to you. Foldkit gives you the architecture, so you can focus on your domain.

Foldkit uses [The Elm Architecture](https://guide.elm-lang.org/architecture/). Application state does not live in component instances or hook lifecycles. The Model is the single source of truth, and every transition stays visible in update. That discipline is a real commitment. Foldkit works best when the team wants one architecture across the application and is ready to build on Effect throughout. [Coming from React?](https://foldkit.dev/react/coming-from-react)

> [!NOTE]
> Foldkit is pre-1.0 and under active development. The architecture is settled and the core API is stable in practice, but breaking changes may occur in minor releases. See the [roadmap](https://foldkit.dev/introduction/roadmap).

## Get Started

Scaffold a browser-only app, a statically generated site, or a server-rendered app with `create-foldkit-app`:

```bash
npx create-foldkit-app@latest
```

The [Get Started guide](https://foldkit.dev/get-started) covers the generated project and how to run it.

## Counter

This complete program defines the Model, Messages, update, init, and view in `main.ts`. `entry.ts` starts the Runtime separately, so tests can import the program without booting it.

```ts
// src/main.ts
import { Schema } from 'effect'
import { Runtime, Update } from 'foldkit'
import { Document, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

// MODEL

export const Model = Schema.Struct({ count: Schema.Number })
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedDecrement: {},
  ClickedIncrement: {},
  ClickedReset: {},
})
export type Message = typeof Message.Type

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedDecrement: () => ({
      model: modifyFields(model, { count: count => count - 1 }),
    }),
    ClickedIncrement: () => ({
      model: modifyFields(model, { count: count => count + 1 }),
    }),
    ClickedReset: () => ({ model: modifyFields(model, { count: () => 0 }) }),
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

Try [Counter in the browser](https://foldkit.dev/example-apps/counter), follow the [walkthrough](https://foldkit.dev/core/counter-example), or explore the [source](https://github.com/foldkit/foldkit/tree/main/examples/counter).

## What Ships With Foldkit

- **Handle side effects:** Use [Commands](https://foldkit.dev/core/commands) for one-time work, [Subscriptions](https://foldkit.dev/core/subscriptions) for external events, [Mounts](https://foldkit.dev/core/mount) for element lifecycles, and [ManagedResources](https://foldkit.dev/core/managed-resources) for stateful handles.
- **Build pages and embedded apps:** Add [routing](https://foldkit.dev/core/routing-and-navigation), [server rendering](https://foldkit.dev/core/server-rendering), or [embedding](https://foldkit.dev/core/embedding).
- **Grow an interface:** Compose [Submodels](https://foldkit.dev/core/submodel) and [UI components](https://foldkit.dev/ui/overview).
- **Test and debug behavior:** Use [Story and Scene testing](https://foldkit.dev/testing) and [DevTools](https://foldkit.dev/core/devtools) to trace state changes.
- **Inspect an app with AI agents:** [DevTools MCP](https://foldkit.dev/ai/mcp) exposes the running Model and Message history.

## Examples

- [Form](https://foldkit.dev/example-apps/form): validation with an async email check
- [Auth](https://foldkit.dev/example-apps/auth): Submodels and OutMessage
- [WebSocket Chat](https://foldkit.dev/example-apps/websocket-chat): a ManagedResource for a live connection
- [Pixel Art](https://foldkit.dev/example-apps/pixel-art): interactive editor with keyboard shortcuts and persistence
- [Typing Game](packages/typing-game): multiplayer game with an Effect RPC backend ([play it live](https://typingterminal.com))

Explore the [full example gallery](https://foldkit.dev/example-apps).

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md) to work on Foldkit and [AGENTS.md](./AGENTS.md) for code conventions. Community projects can use the Foldkit name and logo under the [branding guidelines](./BRANDING.md).

## License

MIT
