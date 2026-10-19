# DevTools MCP Server

## Runtime Access for Agents

`@foldkit/devtools-mcp` gives an AI agent typed access to a running Foldkit application. The agent can inspect Models and Message history, compare past states, replay the UI, and dispatch Messages that pass the application's Message Schema.

The server complements [Foldkit skills](/ai/skills) and the vendored source. Those references explain how the code should be structured. The MCP server shows what the code is doing now.

The same Runtime data also powers [DevTools](/core/devtools). DevTools presents it in a panel for people, while the MCP server exposes it as tools for agents.

## Sensitive Runtime Data

Treat DevTools MCP as privileged access to the running application. A connected agent can read the current, initial, and retained historical Models; every retained Message payload; and the arguments passed to recorded Commands and Mounts. Anything returned by one of those tools enters the agent's context.

### Keep Credentials Out of Runtime Data

Keep API keys, passwords, access and refresh tokens, authorization headers, session material, and private personal data out of the Runtime data DevTools MCP can inspect. A credential used by browser code is already available to someone controlling that browser, so long-lived secrets belong behind a server boundary even when DevTools MCP is disabled. This includes local demos: use fake, scoped, or disposable credentials instead of a production secret.

### Redaction and History Controls

When the browser must temporarily carry a sensitive value, represent it with Effect's `Redacted` type. Use a `Schema.Redacted` field with `disallowJsonEncode: true`, construct its value with `Redacted.make`, and recover it only where the application must use it. `Redacted` prevents normal string, JSON, and inspection output from revealing the value. It does not encrypt the value or make a browser-side credential secret from the person running the browser.

`excludeFromHistory` is not a redaction control. It removes the named Message from history, but the resulting Model remains available through current and historical Model inspection. Omitting `DevToolsConfig.Message` disables agent dispatch only; every inspection and replay tool remains available.

### Disable MCP Connections

To keep the in-browser DevTools while preventing MCP connections, set `devToolsMcpPort: false` in the Foldkit Vite plugin options. Set `devTools: false` in the application config to disable DevTools recording and its browser bridge too.

## Setup

### Projects Created with create-foldkit-app

New projects already include `@foldkit/devtools-mcp` and a `.mcp.json` entry named `foldkit-devtools`. Start the development server, open the application in a browser tab, and open the project in your AI agent.

### Existing Projects

#### Initialize the Project

Run the init command in the project root:

::Snippet{name="aiMcpInit" label="Initialize the DevTools MCP server"}

The command creates `.mcp.json`, or updates only the `foldkit-devtools` entry when the file already exists. Other configured MCP servers remain unchanged.

#### Install the Server Locally

Install the server as a development dependency when you want to avoid an `npx` lookup each time the agent starts:

::Snippet{name="aiMcpInstall" label="Install the DevTools MCP server"}

No Vite config change is needed. The Foldkit plugin starts a relay on its own loopback port, and the MCP server finds it through the project's registry record.

#### Configure a Fixed Port

If automatic discovery is unavailable or the agent runs on another host, set `devToolsMcpPort` in `vite.config.ts`:

::Snippet{name="aiMcpViteConfig" label="Vite configuration for a fixed port"}

Set `FOLDKIT_DEVTOOLS_MCP_PORT` to the same port for the MCP server. When the agent runs on another host, also set `FOLDKIT_DEVTOOLS_MCP_HOST` to the dev server's host. The fixed port listens on every interface without a token. Do not use it on a shared or untrusted network.

#### Enable Message Dispatch

To let an agent dispatch Messages, pass the application's `Message` Schema to `Runtime.makeApplication`:

::Snippet{name="aiMcpApplicationConfig" label="Application configuration"}

Inspection and replay tools work without the Schema. Dispatch tools reject every request until it is configured.

#### Connect the Agent and Browser

Restart the AI agent so it reads `.mcp.json`. The tools appear under the `foldkit-devtools` server.

The application must be open in a browser tab. Its browser bridge connects the running Foldkit Runtime to the Vite relay. Closing the tab removes that Runtime from `foldkit_list_runtimes`.

## Tools

Every tool except `foldkit_list_runtimes` accepts an optional `runtime_id`. Without one, the tool targets the most recently connected Runtime of the most recently started dev server.

| Tool                            | Description                                                                                                                                                                                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `foldkit_list_runtimes`         | Lists every connected browser tab and the metadata needed to select a Runtime. Each tab carries the `projectRoot` of the dev server it belongs to, unless `FOLDKIT_DEVTOOLS_MCP_PORT` or `FOLDKIT_DEVTOOLS_MCP_HOST` is set.                                                    |
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

The browser bridge runs alongside DevTools and sends Runtime data over Vite's HMR WebSocket. The Vite plugin forwards it to MCP clients through a separate loopback listener. Other WebSocket handlers on the dev server cannot close the relay's connection. The MCP server runs under your AI agent and finds the relays for the agent's project. Set `FOLDKIT_PROJECT_ROOT` to search another project.

### Relay Discovery and Access

By default, each dev server publishes its relay's address and a random token to a registry private to your user. The MCP client signs a connection challenge with the token and verifies the relay's response before sending tool requests. Both packages refuse a registry directory that another user can read or replace. They also reject symlinks and junctions, and check directory ACLs on macOS.

The registry lives under `XDG_RUNTIME_DIR` when set, `~/.cache` on macOS and Linux, or the user's temporary directory on Windows. `FOLDKIT_DEVTOOLS_RELAY_DIRECTORY` selects another directory. On Windows, that directory must be a direct child of the user's temporary directory.

The token keeps an unapproved relay client from connecting. It does not hide runtime data from the agent that was given the MCP server.

### Registry Directory Check on Windows

On Windows, both packages use PowerShell to check the directory's owner, access list, ancestors, and reparse points. The registry must be a private direct child of your temporary directory. If the check fails, [configure a fixed port](#configure-a-fixed-port).

### Dev Server Discovery and Runtime Selection

An agent started at a workspace root can inspect every Foldkit app running under it. If none runs under the agent's project root, the MCP server finds the nearest root that encloses it. This lets an agent started in `src/` find the app. `foldkit_list_runtimes` includes each Runtime's `projectRoot`, so the agent can choose the right one. Setting `FOLDKIT_DEVTOOLS_MCP_PORT` or `FOLDKIT_DEVTOOLS_MCP_HOST` skips discovery and connects to that fixed address.

The MCP server connects when a tool is called. Each call checks the registry, so the next call can reach a dev server that started or restarted after the agent.

More than one browser tab can connect at once. `foldkit_list_runtimes` returns each connection ID, and `runtime_id` selects one explicitly. When a tab closes, the relay removes it from the live Runtime list.

### Message Decoding

Messages stay as Effect Schema values across the connection. Before dispatching, an agent can call `foldkit_get_message_schema` for the top-level variants and then inspect the payload shape of the variant it needs. The Runtime decodes the constructed value before it reaches update. A batch is fully decoded before its first Message is dispatched.

## Development and Production

The MCP bridge follows the DevTools lifecycle. DevTools and the bridge are enabled by default during development. Setting `devTools: false` disables both, so no Runtime is visible to MCP.

The Message Schema controls dispatch only. Without it, inspection and replay tools remain available.

The relay and browser bridge run only in development. Production builds omit both, including builds that configure the DevTools panel with `show: 'Always'`.
