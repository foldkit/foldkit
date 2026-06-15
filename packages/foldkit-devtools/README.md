# @foldkit/devtools

The in-browser DevTools overlay for [Foldkit](https://foldkit.dev).

The overlay displays every Message flowing through your app and lets you inspect the Model, Message, Commands, and Mounts at any point in time. Time-travel mode rewinds the UI to any past Model, Inspect mode browses snapshots without pausing the app, and Submodel drill-in scopes the Message list to a nested module. It renders inside a shadow DOM, so it won't interfere with your styles or layout.

## Installation

```bash
pnpm add @foldkit/devtools
# or
npm install @foldkit/devtools
# or
yarn add @foldkit/devtools
```

`@foldkit/devtools` lists `foldkit`, `@foldkit/ui`, and `effect` as peer dependencies, so install those alongside it.

## Usage

The overlay is opt-in. Pass its `overlay` factory as `devTools.overlay` when you create the application:

```typescript
import { overlay } from '@foldkit/devtools'
import { Runtime } from 'foldkit'

const application = Runtime.makeApplication({
  // ...
  devTools: { Message, overlay },
})

Runtime.run(application)
```

Without the overlay, a `devTools` config on its own still records Message history and serves the WebSocket bridge that the [DevTools MCP server](https://foldkit.dev/ai/mcp) connects to. Installing `@foldkit/devtools` and passing `overlay` is what mounts the visual panel in the browser.

See the [DevTools documentation](https://foldkit.dev/core/devtools) for the full configuration surface.

## License

MIT
