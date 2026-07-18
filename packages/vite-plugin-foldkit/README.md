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
import { defineConfig } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'

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

## Automatic branch keys

The plugin also rewrites conditional view arms at build time, in dev and production alike. Every arm that constructs an element directly (ternary arms, Match handler results, if/else returns) gets a stable call-site `h.Key`, so switching branches replaces the subtree instead of patching the old branch's DOM in place. Stale input values, scroll positions, and open states no longer leak across branches.

Explicit keys always win: an arm that already carries `h.Key(...)` or uses `h.keyed(...)` is left untouched. Only direct element construction arms are covered. Arms that delegate to another view function still need a manual key at the branch site, enforced by the `@foldkit/oxlint-plugin` rule `keyed-required-for-delegated-arms`.

Degraded mode: builds without this plugin keep the old semantics, where unkeyed branches patch in place.

## DevTools MCP relay

Pass `devToolsMcpPort` to enable the relay that exposes your running Foldkit app to AI agents via the [`@foldkit/devtools-mcp`](https://www.npmjs.com/package/@foldkit/devtools-mcp) MCP server:

```typescript
plugins: [foldkit({ devToolsMcpPort: 9988 })]
```

When set, the plugin opens a separate WebSocket server on the given port. The MCP server connects to it and forwards typed `Request` and `Response` frames between AI agents and your runtime. Without `devToolsMcpPort` (the default), the relay is not started and the plugin behaves exactly as before.

See the [DevTools MCP documentation](https://foldkit.dev/ai/mcp) for setup, the available tools, and how dispatch validation works.

## License

MIT
