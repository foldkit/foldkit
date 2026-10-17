---
'@foldkit/vite-plugin': minor
'@foldkit/devtools-mcp': minor
---

By default, the DevTools MCP relay now uses its own loopback port. Other Vite plugins and WebSocket proxies can handle upgrades on the dev server without closing the MCP connection. The MCP server also connects when a tool is called, so an agent can start before the dev server and reach it on the next call.

One agent session can now inspect several running Foldkit applications:

- Each dev server publishes a separate registry record. Stopping one server removes only its record.
- The MCP server finds every dev server under the agent's project root. If there are none, it finds the servers at the nearest enclosing root. It compares real paths, so a session started in a subdirectory or through a symlink finds its application.
- `foldkit_list_runtimes` includes each Runtime's `projectRoot`. Without `runtime_id`, a tool targets the most recently connected Runtime of the most recently started dev server.
- A closed browser tab disappears from the Runtime list. A request for a Runtime that no relay lists returns an error without waiting for the request timeout.
- Concurrent tool calls share a registry lookup. Cancelling one call does not cancel discovery for the others. Closing the MCP session releases its relay connections.

Automatic discovery now checks the registry directory before either package uses it. Both reject directories that another user can read, write, or replace, as well as symlinks and junctions. On macOS they also check directory ACLs. On Windows they check ownership, access rights, and reparse points through PowerShell; the registry must be a private direct child of the user's temporary directory. Registry records are created exclusively. The MCP client authenticates a discovered relay with a signed challenge and verifies its response before sending a tool request.

### Upgrading

- The automatic relay no longer follows Vite's `server.host`. To connect from another host, configure `devToolsMcpPort` in Vite and set `FOLDKIT_DEVTOOLS_MCP_PORT` and `FOLDKIT_DEVTOOLS_MCP_HOST` for the MCP server. A fixed port listens on every interface without a token. Do not use it on a shared or untrusted network.
- Setting either `FOLDKIT_DEVTOOLS_MCP_HOST` or `FOLDKIT_DEVTOOLS_MCP_PORT` now selects a fixed address and skips discovery. A host set without a port uses `9988`. Automatic discovery no longer falls back to that port.
- Upgrade the MCP server and Vite plugin together. The new MCP server requires a discovered relay to prove its identity, which an older plugin cannot do.
- When `XDG_RUNTIME_DIR` is unset on macOS or Linux, the default registry moves to `~/.cache/foldkit-devtools-relays`. Upgrade both packages together, or set `FOLDKIT_DEVTOOLS_RELAY_DIRECTORY` to the same private directory in both processes.

`devToolsMcpPort`, the registry record format, and the tool inputs are unchanged.
