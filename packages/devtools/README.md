# @foldkit/devtools

The in-browser DevTools overlay for [Foldkit](https://foldkit.dev).

The overlay displays every Message flowing through your app and lets you inspect the Model, Message, Commands, and Mounts at any point in time. Time-travel mode rewinds the UI to any past Model, Inspect mode browses snapshots without pausing the app, and the Block filter scopes the Message list to one child Block instance. It renders inside a shadow DOM, so it won't interfere with your styles or layout.

## Installation

```bash
pnpm add --save-dev @foldkit/devtools
# or
npm install --save-dev @foldkit/devtools
# or
yarn add --dev @foldkit/devtools
```

`@foldkit/devtools` lists `foldkit`, `@foldkit/ui`, `effect`, and `@effect/platform-browser` as peer dependencies, so install those alongside it.

## Usage

With `@foldkit/vite-plugin`, installing this package as a development dependency is enough to mount the overlay during development. The plugin leaves it out of production builds:

```typescript
// src/entry.ts
import { Program, Runtime } from 'foldkit'

import { Application, ApplicationLive } from './application'

const program = Program.make(Application, {
  layer: ApplicationLive,
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})

Runtime.run(program)
```

The application root is an ordinary Block class, `class Application extends Block<Application>()('Application', { Model, Message }) {}`, implemented with `Application.make(...)`. Pass the class and its Layer to `Program.make` in the entry point.

The overlay shows the Model as one resolved tree: each child Block instance appears as its own Model. A Message sent to a child instance is listed with its instance path, such as `rows › row-3 › ClickedIncrement`, and the Block filter narrows the list to one instance or collection and everything below it.

The `devTools` configuration is optional. Development inspection is enabled by default, while external Message dispatch is disabled. Set `dispatch: true` when the [DevTools MCP server](https://foldkit.dev/ai/mcp) should discover and dispatch the root Block's Messages.

To include the overlay in production, move `@foldkit/devtools` to regular `dependencies` and set `show: 'Always'`. The dependency section is the build-time opt-in, and `show` controls whether the Runtime mounts it:

```typescript
const program = Program.make(Application, {
  layer: ApplicationLive,
  container,
  // ...
  devTools: {
    show: 'Always',
  },
})
```

See the [DevTools documentation](https://foldkit.dev/core/devtools) for the full configuration surface.

## License

MIT
