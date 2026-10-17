# @foldkit/devtools

The in-browser DevTools overlay for [Foldkit](https://foldkit.dev).

The overlay displays every Message flowing through your app and lets you inspect the Model, Message, Commands, and Mounts at any point in time. Time-travel mode rewinds the UI to any past Model, Inspect mode browses snapshots without pausing the app, and Block drill-in scopes the Message list to a nested module. It renders inside a shadow DOM, so it won't interfere with your styles or layout.

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
import { Runtime } from 'foldkit'

import {
  ApplicationComposition,
  init,
  update,
  view,
  Message,
} from './application'

const application = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

Runtime.run(application)
```

`Application` is the typed authoring value created by `defineApplication({ Model, Message })`. Export `ApplicationComposition = Application.makeComposition({ childBindings })` from `application.ts`, or call `makeComposition()` for a root without child Bindings. Complete that Composition with `ApplicationComposition.makeApplication` in the entry point.

The `devTools` configuration is optional unless you need settings such as `Message`, `position`, or `excludeFromHistory`. Recording and the WebSocket bridge that the [DevTools MCP server](https://foldkit.dev/ai/mcp) connects to live in Foldkit's core Runtime.

To include the overlay in production, move `@foldkit/devtools` to regular `dependencies` and set `show: 'Always'`. The dependency section is the build-time opt-in, and `show` controls whether the Runtime mounts it:

```typescript
const application = ApplicationComposition.makeApplication({
  // ...
  devTools: {
    show: 'Always',
  },
})
```

See the [DevTools documentation](https://foldkit.dev/core/devtools) for the full configuration surface.

## License

MIT
