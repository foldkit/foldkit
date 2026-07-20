# @foldkit/devtools-mcp

A Model Context Protocol server that exposes a running [Foldkit](https://foldkit.dev) app to AI agents (Claude Code, Codex, Cursor, Windsurf, anything that speaks MCP).

With it attached, agents can:

- Read the current Model, or any historical Model by history index
- Narrow reads with dot-string paths and summarized payloads to fit token budgets
- List and inspect the Message history, with Command and Mount lifecycle, diffs, and submodel chains
- Query history server-side: filter entries by changed Model paths, count Messages by tag, tail the latest entries, and diff the Models at two indices
- Read the recorded init Model, the Commands returned from `init`, and the Mounts that fired during the first render
- Inspect runtime state: current index, retained history bounds, pause status
- Replay to any past state and resume
- Discover the runtime's `Message` Schema as JSON Schema so agents can construct valid payloads without reading the application source
- Dispatch Messages into the runtime, decoded against your `Message` Schema

## Quick Start

Projects scaffolded with [`create-foldkit-app`](https://foldkit.dev/get-started/getting-started) ship with the MCP server pre-wired. Open the project in your AI agent and the tools appear under the `foldkit-devtools` prefix.

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
import { defineConfig } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'

export default defineConfig({
  plugins: [foldkit({ devToolsMcpPort: 9988 })],
})
```

In your `Runtime.makeApplication` call, pass your `Message` Schema. The runtime decodes every dispatched payload against it, returning a clean error if the shape does not match before it reaches your update function:

```typescript
Runtime.makeApplication({
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

| Tool                            | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `foldkit_list_runtimes`         | Returns metadata for every connected browser tab. Agents call this first to discover which runtime to target.                                                                                                                                                                                                                                                                                                                                                                                             |
| `foldkit_get_model`             | Snapshots the current Model. Accepts an optional `path` to narrow to a subtree and `expand` to control summarization.                                                                                                                                                                                                                                                                                                                                                                                     |
| `foldkit_get_model_at`          | Snapshots a historical Model after a given history entry. Pass `index: N - 1` to read the Model just before message `N`. Same `path`/`expand` semantics as `foldkit_get_model`. Indices outside the readable range (older entries are evicted past the rolling buffer) are rejected with the valid bounds. For the initial Model (and the init Commands and Mounts), use `foldkit_get_init`.                                                                                                              |
| `foldkit_get_init`              | Reads the recorded initial Model, the Commands returned from the application's `init` function, and the Mounts that fired during the first render. Each Command and Mount carries its declared args. Equivalent to selecting the synthetic "init" row in the DevTools panel.                                                                                                                                                                                                                              |
| `foldkit_get_runtime_state`     | Snapshots the runtime's DevTools state: history bounds, current paused/live status, and whether init is recorded. Useful for understanding what `foldkit_list_messages` and `foldkit_get_message` will see and detecting whether the runtime is paused.                                                                                                                                                                                                                                                   |
| `foldkit_list_messages`         | Lists Message history entries. Each entry carries the Message body, Commands triggered (with args), Mounts that started or ended during the resulting render (with args), timestamp, an `isModelChanged` flag, the diff path lists (`changedPaths` / `affectedPaths`), and any extracted Submodel chain. Filter server-side with `changed_paths_match`, read the latest entries with `from_end`, and paginate forward with `since_index`.                                                                 |
| `foldkit_count_messages_by_tag` | Counts retained history entries by Message tag, without payloads, sorted by count descending. A cheap reconnaissance call before paging through history: it surfaces the high-frequency Messages worth filtering out, and with `changed_paths_match` it answers which Message tags touch a Model subtree.                                                                                                                                                                                                 |
| `foldkit_diff_models`           | Diffs the Models at two history indices server-side, returning path-level changes `{ path, before, after }` with summarized values. Each side is `{ _tag: 'Present', value }`, or `{ _tag: 'Absent' }` when the path does not exist on that side. Pass `changed_paths_match` to narrow the diff to a subtree.                                                                                                                                                                                             |
| `foldkit_get_message`           | Reads one entry at a given index. The response carries the SerializedEntry only; to inspect the Model around the entry, call `foldkit_get_model_at` with `index - 1` (before) and `index` (after). Use `foldkit_get_init` for the synthetic init entry.                                                                                                                                                                                                                                                   |
| `foldkit_list_keyframes`        | Returns the indices Foldkit can replay back to. Index `-1` is the initial Model.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `foldkit_replay_to_keyframe`    | Time-travels the runtime to a previous state. The runtime is paused at that snapshot until `foldkit_resume` is called.                                                                                                                                                                                                                                                                                                                                                                                    |
| `foldkit_resume`                | Resumes normal execution after a replay.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `foldkit_get_message_schema`    | Describes the runtime's Message Schema so agents can construct valid Messages without reading the application source. With no arguments, returns a small variant index (top-level tag names plus payload fields). With `variant_tag` set to a dot-separated path of variant tags (e.g. `"GotChildMessage.Opened"`), narrows the JSON Schema along the chain and collapses deeper unions to summary placeholders. Returns `maybeResult: None` when the runtime hasn't configured `DevToolsConfig.Message`. |
| `foldkit_dispatch_message`      | Dispatches a Message into the runtime as if your application produced it. The runtime decodes the payload against your Schema and returns a clean error if it does not match.                                                                                                                                                                                                                                                                                                                             |

### Reading the Model efficiently

`foldkit_get_model` and `foldkit_get_model_at` are designed for AI agents reading state into a token-bounded context. Two parameters control the payload size:

- **`path`** is a dot-string anchored at `root` that narrows the response to a subtree. The alphabet matches the `changedPaths` array on each `SerializedEntry`, so a path observed in `foldkit_list_messages` can be passed straight back. Examples: `'root'` (the whole Model), `'root.route'`, `'root.session.user'`, `'root.cards.0'`. When the path doesn't resolve, the response is an error listing the keys available at the deepest segment that did resolve, so the agent can refine in one follow-up call.
- **`expand`** controls summarization. By default (`false`), large arrays collapse to `{ _summary: 'array', length, sample: [head, last] }`, deeply nested records collapse to `{ _summary: 'record', keys }`, and long strings collapse to `{ _summary: 'string', length, head }`. Tagged-union variants (`{ _tag, ... }`) keep their tag and recursively summarize children. With `expand: true`, the literal value at the path is returned with no summarization. Pair a narrow `path` with `expand: true` to read a specific subtree at full fidelity without paying for the rest of the Model.

### Querying history efficiently

High-frequency flows (drag-paint, scroll, keystroke) can fill the history buffer with thousands of entries; reading them page by page burns agent context. The history tools query server-side instead, in Model terms rather than Message-tag terms:

1. **Recon with `foldkit_count_messages_by_tag`.** A few hundred bytes regardless of history size. It shows which tags dominate and the absolute index range retained.
2. **Filter with `changed_paths_match`.** Both `foldkit_list_messages` and `foldkit_count_messages_by_tag` accept dot-string patterns matched against each entry's `changedPaths`. Patterns compare segment by segment for the length of the shorter side, so `root.grid` matches every change inside the grid subtree and `root.grid.5.3` also matches a wholesale replacement recorded at `root.grid`. `*` matches exactly one segment: `root.cards.*.title`. The path alphabet is the same one `foldkit_get_model` uses, so paths can be copied between tools.
3. **Tail with `from_end: true`.** The natural live-debugging lens is "what just happened". `from_end` returns the final `limit` matching entries without first discovering the total count.
4. **Diff with `foldkit_diff_models`.** Once the interesting indices are known, ask for the path-level delta between them instead of fetching two full snapshots and diffing client-side.

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
