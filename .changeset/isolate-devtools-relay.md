---
'@foldkit/vite-plugin': minor
'@foldkit/devtools-mcp': minor
---

By default, the DevTools MCP relay now listens on a loopback port of its own instead of on the dev server. Before, it shared the dev server's listener, where every handler of a WebSocket upgrade receives the same socket and none can claim it. A plugin that forwards every other upgrade to its own server, or a `server.proxy` entry with `ws: true` that matched the relay's path, destroyed the relay connection moments after it opened, so MCP tool calls failed and the MCP server reconnected thousands of times a second. On its own listener, the relay answers an upgrade for another path with 404, one it cannot parse with 400, one without the token with 401, and a plain HTTP request with 426.

Several applications, agent sessions, and dev servers now work at once:

- Each dev server publishes its own registry record, named by its relay id, and removes only that record when it stops. Before, a second dev server for the same root replaced the first one's record and deleted it on exit, so the first dev server could no longer be found.
- The MCP server reaches every dev server under its project root. When none runs there, it reaches every dev server at the nearest root that encloses the project root, so a session started in `src/` or through a symlink finds its application. `foldkit_list_runtimes` lists the Runtimes of every dev server it reaches, oldest dev server first, and adds `projectRoot` to each.
- The relay lists Runtimes in the order they connected. A tool called without `runtime_id` targets the most recently connected Runtime of the most recently started dev server. Before, the relay listed them in hash order, so the default could be any open tab.
- The MCP server no longer connects in the background. It looks up the registry and connects when a tool is called, so a dev server started or restarted after the agent is reached on the next call, and a relay that drops connections costs one connection attempt per call. Every call, including one that names a `runtime_id`, lists the Runtimes again before it sends a request, so a request for a Runtime that no dev server lists fails at once instead of after ten seconds.
- The relay removes the Runtimes of a browser tab whose socket closes, and answers a request for a Runtime it does not list with an error. Before, a closed tab stayed in `foldkit_list_runtimes`, and a request to it waited for the MCP server's ten-second timeout.
- MCP request cancellation interrupts the waiting tool call while shared discovery remains available to other calls. Closing the MCP session interrupts discovery and releases its relay sockets.
- The MCP server ignores a registry directory that is owned by another user, that other users can read or write, that is a symlink or junction, or whose parent chain lets another user replace a directory. The plugin applies the same check before publishing. On macOS, both also refuse ACLs that grant access. Registry record files are created exclusively, so an existing path cannot redirect publication. The MCP client signs a challenge with the published token and verifies the relay's proof before sending tool requests, so a replacement listener cannot impersonate a relay from a stale record.
- On Windows, the Vite plugin and the MCP server inspect the registry directory and its ancestors through the Windows .NET API in PowerShell on every lookup. They refuse reparse-point ancestors and require the registry to be a private direct child of the user's temporary directory, so automatic discovery is no longer limited to macOS and Linux.

This breaks five setups:

- The relay no longer follows `server.host`, so an agent on another host cannot reach a discovered relay. Set `devToolsMcpPort` in the Vite config, and set `FOLDKIT_DEVTOOLS_MCP_PORT` and `FOLDKIT_DEVTOOLS_MCP_HOST` for the MCP server. That port has no token, so do not use it on a shared or untrusted network.
- `FOLDKIT_DEVTOOLS_MCP_HOST` no longer replaces the host of a discovered relay. Like `FOLDKIT_DEVTOOLS_MCP_PORT`, it now skips discovery and connects to that host on the configured port, or on `9988`.
- A new MCP server refuses an older automatic relay that cannot prove its identity. Upgrade the MCP server and Vite plugin together to use the signed connection handshake.
- Automatic discovery does not connect to port `9988` when no authenticated relay is published. To use a fixed-port relay, set `FOLDKIT_DEVTOOLS_MCP_PORT` to the port configured with `devToolsMcpPort`.
- When `XDG_RUNTIME_DIR` is unset on macOS or Linux, the default registry moves from the operating system's temporary directory to `~/.cache/foldkit-devtools-relays`. Upgrade the MCP server and Vite plugin together, or set `FOLDKIT_DEVTOOLS_RELAY_DIRECTORY` to the same private directory in both processes.

`devToolsMcpPort`, the token, the record format, and every tool name and input are unchanged.
