# @foldkit/devtools-mcp

## 0.1.0

### Minor Changes

- 6426adb: Add DevTools MCP support so AI agents (Claude Code, Codex, Cursor, Windsurf, anything that speaks MCP) can connect to a running Foldkit app. Agents read the current Model, list and inspect Message history, replay to past states, and dispatch Messages into the runtime. The runtime's own Message Schema is published as JSON Schema so the agent discovers exactly what it can dispatch, and every payload is validated against the Schema before reaching the update loop.

  ## Migration

  The `devtools` config field on `Runtime.makeProgram` is now `devTools` (capital T). Type `DevtoolsConfig` is now `DevToolsConfig`.

  ```diff
   Runtime.makeProgram({
  -  devtools: { position: 'BottomRight' },
  +  devTools: { position: 'BottomRight' },
   })
  ```

  If you import the type directly:

  ```diff
  -import type { DevtoolsConfig } from 'foldkit'
  +import type { DevToolsConfig } from 'foldkit'
  ```

  ## What's new
  - **`foldkit/devtools-protocol`** (new entry point) exposes the typed `Request`/`Response`/`Event` Schemas and a browser-side WebSocket bridge that streams DevTools store updates to the relay.
  - **`DevToolsConfig.Message`** is a new optional field. When set to your app's `Message` Schema, the runtime publishes it as JSON Schema to the agent and validates every dispatched payload against it before reaching the update loop. Without it, dispatch is rejected; the read-only tools still work.
  - **`@foldkit/vite-plugin`** accepts a new `devToolsMcpPort` option. When set, the plugin opens a WebSocket relay on that port that forwards traffic between connected browser tabs and any external MCP client. Without it, HMR behavior is unchanged. The relay only runs at dev time; production builds never include it.
  - **`@foldkit/devtools-mcp`** is a new package: an MCP server that runs as a Node child process spawned by your AI agent. Run `npx @foldkit/devtools-mcp init` in your project root to register it. See [foldkit.dev/ai/mcp](https://foldkit.dev/ai/mcp) for the full guide.
  - **`create-foldkit-app`** scaffolds new projects with `@foldkit/devtools-mcp` installed as a dev dependency, a `.mcp.json` registering the server, and a `vite.config.ts` that passes `devToolsMcpPort: 9988` to the Foldkit plugin.

### Patch Changes

- Updated dependencies [6426adb]
  - foldkit@0.76.0
