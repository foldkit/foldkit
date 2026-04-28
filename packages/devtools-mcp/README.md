# @foldkit/devtools-mcp

A Model Context Protocol server that exposes a running [Foldkit](https://foldkit.dev) app to AI agents (Claude Code, Codex, Cursor, Windsurf, anything that speaks MCP).

With it attached, agents can:

- Read the current Model, or any historical Model by history index
- Narrow reads with dot-string paths and summarized payloads to fit token budgets
- List and inspect the Message history, with diffs and submodel chains
- Read the recorded init Model and init Command names
- Inspect runtime state: current index, retained history bounds, pause status
- Replay to any past state and resume
- Dispatch Messages into the runtime, decoded against your `Message` Schema

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

In your `Runtime.makeProgram` call, pass your `Message` Schema. The runtime decodes every dispatched payload against it, returning a clean error if the shape does not match before it reaches your update function:

```typescript
Runtime.makeProgram({
  devTools: {
    // Rest of your DevTools config
    Message,
  },
})
```

Restart your dev server, then restart your AI agent. The MCP server will appear with the `foldkit_*` tools attached.

The browser bridge runs inside your app, so the MCP server only sees a runtime while the app is open in a browser tab. Close the tab and the runtime disappears from `foldkit_list_runtimes`.

## Tools

Each tool accepts an optional `runtime_id`. When omitted, the most recently connected runtime is used.

| Tool                         | Description                                                                                                                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `foldkit_list_runtimes`      | Returns metadata for every connected browser tab. Agents call this first to discover which runtime to target.                                                                                                                                           |
| `foldkit_get_model`          | Snapshots the current Model. Accepts an optional `path` to narrow to a subtree and `expand` to control summarization.                                                                                                                                   |
| `foldkit_get_model_at`       | Snapshots a historical Model after a given history entry. Pass `index: N - 1` to read the Model just before message `N`. Same `path`/`expand` semantics as `foldkit_get_model`. For the initial Model (and init Command names), use `foldkit_get_init`. |
| `foldkit_get_init`           | Reads the recorded initial Model and the names of Commands returned from the application's `init` function. Equivalent to selecting the synthetic "init" row in the DevTools panel.                                                                     |
| `foldkit_get_runtime_state`  | Snapshots the runtime's DevTools state: history bounds, current paused/live status, and whether init is recorded. Useful for understanding what `foldkit_list_messages` and `foldkit_get_message` will see and detecting whether the runtime is paused. |
| `foldkit_list_messages`      | Lists recent Message history entries with pagination. Each entry carries the Message body, Command names triggered, timestamp, an `isModelChanged` flag, the diff path lists (`changedPaths` / `affectedPaths`), and any extracted Submodel chain.      |
| `foldkit_get_message`        | Reads one entry at a given index. The response carries the SerializedEntry only; to inspect the Model around the entry, call `foldkit_get_model_at` with `index - 1` (before) and `index` (after). Use `foldkit_get_init` for the synthetic init entry. |
| `foldkit_list_keyframes`     | Returns the indices Foldkit can replay back to. Index `-1` is the initial Model.                                                                                                                                                                        |
| `foldkit_replay_to_keyframe` | Time-travels the runtime to a previous state. The runtime is paused at that snapshot until `foldkit_resume` is called.                                                                                                                                  |
| `foldkit_resume`             | Resumes normal execution after a replay.                                                                                                                                                                                                                |
| `foldkit_dispatch_message`   | Enqueues a Message into the runtime as if your application produced it. The runtime decodes the payload against your Schema and returns a clean error if it does not match.                                                                             |

### Reading the Model efficiently

`foldkit_get_model` and `foldkit_get_model_at` are designed for AI agents reading state into a token-bounded context. Two parameters control the payload size:

- **`path`** is a dot-string anchored at `root` that narrows the response to a subtree. The alphabet matches the `changedPaths` array on each `SerializedEntry`, so a path observed in `foldkit_list_messages` can be passed straight back. Examples: `'root'` (the whole Model), `'root.route'`, `'root.session.user'`, `'root.cards.0'`. When the path doesn't resolve, the response is an error listing the keys available at the deepest segment that did resolve, so the agent can refine in one follow-up call.
- **`expand`** controls summarization. By default (`false`), large arrays collapse to `{ _summary: 'array', length, sample: [head, last] }`, deeply nested records collapse to `{ _summary: 'record', keys }`, and long strings collapse to `{ _summary: 'string', length, head }`. Tagged-union variants (`{ _tag, ... }`) keep their tag and recursively summarize children. With `expand: true`, the literal value at the path is returned with no summarization. Pair a narrow `path` with `expand: true` to read a specific subtree at full fidelity without paying for the rest of the Model.

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
