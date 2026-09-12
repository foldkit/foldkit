# DevTools MCP Server

## Runtime Access for Agents

`@foldkit/devtools-mcp` gives an AI agent typed access to a running Foldkit application. The agent can inspect Models and Message history, compare past states, replay the UI, and dispatch Messages that pass the application's Message Schema.

The server complements [Foldkit skills](/ai/skills) and the vendored source. Those references explain how the code should be structured. The MCP server shows what the code is doing now.

The same Runtime data also powers [DevTools](/devtools). DevTools presents it in a panel for people, while the MCP server exposes it as tools for agents.

## Setup

### Projects Created with create-foldkit-app

New projects already include `@foldkit/devtools-mcp`, a `.mcp.json` entry named `foldkit-devtools`, and a Vite relay on port `9988`. Start the development server, open the application in a browser tab, and open the project in your AI agent.

### Existing Projects

Run the init command in the project root:

::Snippet{name="aiMcpInit" label="initialize the DevTools MCP server"}

The command creates `.mcp.json`, or updates only the `foldkit-devtools` entry when the file already exists. Other configured MCP servers remain unchanged.

Install the server as a development dependency when you want to avoid an `npx` lookup each time the agent starts:

::Snippet{name="aiMcpInstall" label="install the DevTools MCP server"}

In `vite.config.ts`, set `devToolsMcpPort` so the Foldkit plugin opens the WebSocket relay:

::Snippet{name="aiMcpViteConfig" label="Vite config snippet"}

To let an agent dispatch Messages, pass the application's `Message` Schema to `Runtime.makeApplication`:

::Snippet{name="aiMcpApplicationConfig" label="application config snippet"}

Inspection and replay tools work without the Schema. Dispatch tools reject every request until it is configured.

Restart the development server after changing the Vite config, then restart the AI agent so it reads `.mcp.json`. The tools appear under the `foldkit-devtools` server.

The application must be open in a browser tab. Its browser bridge connects the running Foldkit Runtime to the Vite relay. Closing the tab removes that Runtime from `foldkit_list_runtimes`.

## Tools

Every tool except `foldkit_list_runtimes` accepts an optional `runtime_id`. Without one, the tool targets the most recently connected Runtime.

| Tool                            | Description                                                                                                                                                                                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `foldkit_list_runtimes`         | Lists every connected browser tab and the metadata needed to select a Runtime.                                                                                                                                                                                                  |
| `foldkit_get_model`             | Reads the current Model. Use `path` to select a subtree and `expand` to control summarization.                                                                                                                                                                                  |
| `foldkit_get_model_at`          | Reads the Model after a retained history entry. Use `index: N - 1` for the Model before Message `N`, and `foldkit_get_init` for the initial Model.                                                                                                                              |
| `foldkit_get_init`              | Reads the initial Model, the Commands returned by init, and the Mounts that started during the first render.                                                                                                                                                                    |
| `foldkit_get_runtime_state`     | Reports retained history bounds, the current index, pause state, and whether init has been recorded.                                                                                                                                                                            |
| `foldkit_list_messages`         | Lists retained Messages with Command and Mount activity, timestamps, changed Model paths, and Submodel chains. Supports forward pagination, tail reads, and filtering with `changed_paths_match`.                                                                               |
| `foldkit_count_messages_by_tag` | Counts retained Messages by tag. It accepts the same `since_index` and `changed_paths_match` filters as `foldkit_list_messages`.                                                                                                                                                |
| `foldkit_diff_models`           | Diffs two historical Models by path. Each side records whether the value is present or absent, and `changed_paths_match` can narrow the result.                                                                                                                                 |
| `foldkit_get_message`           | Reads one history entry, including its Message, Commands, Mount starts and ends, changed paths, and Submodel chain. Use `foldkit_get_model_at` to inspect the Model before and after it.                                                                                        |
| `foldkit_list_keyframes`        | Lists the retained states that can be replayed. Index `-1` is the initial Model.                                                                                                                                                                                                |
| `foldkit_replay_to_keyframe`    | Replays the application to a retained state and pauses normal execution there.                                                                                                                                                                                                  |
| `foldkit_resume`                | Returns a replayed Runtime to live execution.                                                                                                                                                                                                                                   |
| `foldkit_get_message_schema`    | Describes the Message Schema as JSON Schema. Call it without arguments for a variant index, then pass a dot-separated `variant_tag` to inspect one variant or Submodel chain.                                                                                                   |
| `foldkit_dispatch_message`      | Dispatches one Message after decoding it against the configured Message Schema.                                                                                                                                                                                                 |
| `foldkit_dispatch_messages`     | Validates and dispatches an ordered batch of 1 to 100 Messages. Validation is all-or-nothing, so one invalid payload rejects the batch before any Message is dispatched. The response returns predicted history indices, but other Messages can land between the batch entries. |

## Connection Flow

The browser bridge runs alongside DevTools and subscribes to the DevTools store. The Vite plugin opens a WebSocket server on `devToolsMcpPort` and relays requests between connected browser tabs and MCP clients. The MCP server runs as a child process of the AI agent and exposes those requests as typed tools.

More than one browser tab can connect at once. `foldkit_list_runtimes` returns each connection ID, and `runtime_id` selects one explicitly. When a tab closes, the relay removes it from the live Runtime list.

Messages stay as Effect Schema values across the connection. Before dispatching, an agent can call `foldkit_get_message_schema` for the top-level variants and then inspect the payload shape of the variant it needs. The Runtime decodes the constructed value before it reaches update. A batch is fully decoded before its first Message is dispatched.

If the development server restarts, the MCP process reconnects to the relay with exponential backoff. The agent does not need another restart.

## Development and Production

The MCP bridge follows the DevTools lifecycle. DevTools and the bridge are enabled by default during development. Setting `devTools: false` disables both, so no Runtime is visible to MCP.

The Message Schema controls dispatch only. Without it, inspection and replay tools remain available.

The relay and browser bridge run only in development. Production builds omit both, including builds that configure the DevTools panel with `show: 'Always'`.
