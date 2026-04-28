# @foldkit/devtools-mcp

A Model Context Protocol server that exposes a running [Foldkit](https://foldkit.dev) app to AI agents (Claude Code, Codex, Cursor, Windsurf, anything that speaks MCP).

With it attached, agents can:

- Read the current Model
- List and inspect the Message history
- Replay to any past state and resume
- Dispatch Messages into the runtime, validated against your `Message` Schema

## Quick Start

Projects scaffolded with [`create-foldkit-app`](https://foldkit.dev/getting-started) ship with the MCP server pre-wired. Open the project in your AI agent and the tools appear under the `foldkit-devtools` prefix.

For existing projects, run the init command in your project root:

```bash
npx @foldkit/devtools-mcp init
```

This writes a `.mcp.json` (or merges into an existing one) so any MCP-aware agent picks up the server.

For faster startup, install the MCP server as a devDependency. Otherwise `npx` fetches it on each AI agent restart:

```bash
npm install -D @foldkit/devtools-mcp
# or
pnpm add -D @foldkit/devtools-mcp
# or
yarn add -D @foldkit/devtools-mcp
```

Then make two edits to your project.

In `vite.config.ts`, pass `devToolsMcpPort` to the Foldkit plugin so it opens the relay:

```typescript
import { foldkit } from '@foldkit/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [foldkit({ devToolsMcpPort: 9988 })],
})
```

In your `Runtime.makeProgram` call, pass your `Message` Schema. This is what the agent sees when it asks "what Messages can I dispatch?", and it gates dispatch by validating every payload before it reaches your update function:

```typescript
Runtime.makeProgram({
  devTools: {
    // Rest of your DevTools config
    Message,
  },
})
```

Restart your dev server, then restart your AI agent. The MCP server will appear with the eight `foldkit_*` tools attached.

## Tools

Each tool accepts an optional `runtime_id`. When omitted, the most recently connected runtime is used.

| Tool                         | Description                                                                                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `foldkit_list_runtimes`      | Returns metadata for every connected browser tab, including each runtime's Message Schema as JSON Schema. Agents call this first to discover what they can dispatch. |
| `foldkit_get_model`          | Snapshots the current Model.                                                                                                                                         |
| `foldkit_list_messages`      | Lists recent Message history entries with pagination. Each entry carries the Message body, command names triggered, timestamp, and a path-level diff.                |
| `foldkit_get_message`        | Reads one entry at a given index, including the Model before and after the Message was applied.                                                                      |
| `foldkit_list_keyframes`     | Returns the indices Foldkit can replay back to. Index `-1` is the initial Model.                                                                                     |
| `foldkit_replay_to_keyframe` | Time-travels the runtime to a previous state. The runtime is paused at that snapshot until `foldkit_resume` is called.                                               |
| `foldkit_resume`             | Resumes normal execution after a replay.                                                                                                                             |
| `foldkit_dispatch_message`   | Enqueues a Message into the runtime as if your application produced it. The bridge validates the payload against your Schema before it reaches the update loop.      |

## Architecture

Three components cooperate:

- **Browser bridge** (in `foldkit`): runs alongside DevTools, subscribes to the DevTools store, and exchanges typed frames over Vite's HMR WebSocket.
- **Vite plugin relay** (in `@foldkit/vite-plugin`): opens a separate WebSocket server on `devToolsMcpPort` and forwards traffic between browsers and MCP clients.
- **MCP server** (this package): runs as a Node child process under your AI agent, connects to the plugin's relay over WebSocket, and exposes the typed tools over MCP's stdio transport.

Multiple browser tabs can be connected at once and each is addressable by its connection id. Tabs that close (gracefully or not) are pruned from the live runtime list automatically.

## Configuration

| Environment variable        | Default     | Description                                                                              |
| --------------------------- | ----------- | ---------------------------------------------------------------------------------------- |
| `FOLDKIT_DEVTOOLS_MCP_HOST` | `localhost` | Hostname of the Vite plugin relay.                                                       |
| `FOLDKIT_DEVTOOLS_MCP_PORT` | `9988`      | Port the Vite plugin relay listens on. Must match `devToolsMcpPort` in your Vite config. |

## Notes

- The MCP bridge shares its lifecycle with Foldkit DevTools. If you set `devTools: false` in your program config, the bridge does not start and the runtime is invisible to MCP. The default enables the bridge in dev.
- Without `Message` in your `DevToolsConfig`, dispatch is rejected. The other (read-only) tools still work.
- The relay only runs at dev time. Production builds never include the relay or the bridge, regardless of any `show` setting.

## Documentation

See [foldkit.dev/ai/mcp](https://foldkit.dev/ai/mcp) for the full guide.

## License

MIT
