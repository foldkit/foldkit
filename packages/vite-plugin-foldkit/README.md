# @foldkit/vite-plugin

Vite plugin for Foldkit that enables hot module reloading with model preservation.

## Installation

```bash
npm install -D @foldkit/vite-plugin
# or
pnpm add -D @foldkit/vite-plugin
# or
yarn add -D @foldkit/vite-plugin
```

## Usage

Add the plugin to your `vite.config.ts`:

```typescript
import { foldkit } from '@foldkit/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [foldkit()],
})
```

## What it does

When you save a file during development, the plugin:

1. Preserves your application's current state (model)
2. Triggers a full page reload
3. Restores the preserved model after reload

This means you can make code changes without losing your application's state - forms stay filled, counters keep their values, game positions are maintained, etc.

## How it works

The plugin uses Vite's WebSocket connection to communicate between the dev server and browser:

- **On file change**: The browser sends the current model to the Vite server for preservation
- **On reload**: The browser requests the preserved model from the server and initializes the Foldkit runtime with it

Model is preserved across hot reloads but cleared on manual browser refreshes, giving you control over when to reset your app.

## DevTools MCP relay

Pass `devToolsMcpPort` to enable the relay that exposes your running Foldkit app to AI agents via the [`@foldkit/devtools-mcp`](https://www.npmjs.com/package/@foldkit/devtools-mcp) MCP server:

```typescript
plugins: [foldkit({ devToolsMcpPort: 9988 })]
```

When set, the plugin opens a separate WebSocket server on the given port. The MCP server connects to it and forwards typed `Request` and `Response` frames between AI agents and your runtime. Without `devToolsMcpPort` (the default), the relay is not started and the plugin behaves exactly as before.

See the [DevTools MCP documentation](https://foldkit.dev/ai/mcp) for setup, the available tools, and how dispatch validation works.

## License

MIT
