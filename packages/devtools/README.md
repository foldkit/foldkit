# @foldkit/devtools

The in-browser DevTools overlay for [Foldkit](https://foldkit.dev).

The overlay displays every Message flowing through your app and lets you inspect the Model, Message, Commands, and Mounts at any point in time. Time-travel mode rewinds the UI to any past Model, Inspect mode browses snapshots without pausing the app, and Submodel drill-in scopes the Message list to a nested module. It renders inside a shadow DOM, so it won't interfere with your styles or layout.

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
import { Runtime } from 'foldkit'

const application = Runtime.makeApplication({
  // ...
  devTools: {
    Message,
  },
})

Runtime.run(application)
```

The `devTools` configuration is optional unless you need settings such as `Message`, `position`, or `excludeFromHistory`. Recording and the WebSocket bridge that the [DevTools MCP server](https://foldkit.dev/ai/mcp) connects to live in Foldkit's core Runtime.

To include the overlay in production, move `@foldkit/devtools` to regular `dependencies` and set `show: 'Always'`. The dependency section is the build-time opt-in, and `show` controls whether the Runtime mounts it:

```typescript
const application = Runtime.makeApplication({
  // ...
  devTools: {
    show: 'Always',
  },
})
```

See the [DevTools documentation](https://foldkit.dev/devtools) for the full configuration surface.

## License

MIT
