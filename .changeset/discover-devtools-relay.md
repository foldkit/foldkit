---
'foldkit': minor
'@foldkit/vite-plugin': minor
'@foldkit/devtools-mcp': minor
'create-foldkit-app': patch
---

The DevTools MCP relay now starts without a configured port. In development, the Vite server serves it at `/__foldkit/devtools-mcp` and publishes its address to a per-user registry. The MCP server finds the most recently started relay for its project and finds it again after a dev server restart. Projects no longer need matching port settings, and two projects can run without competing for a relay port. The relay follows Vite's `server.host` setting.

Each published address includes a random token. The relay requires that token before allowing Model inspection or Message dispatch, including when the dev server is exposed with `--host`. The plugin will not publish a token into a registry directory owned by another user or readable by other users. It reports the problem in the console; the relay can still be reached through a configured port.

Middleware mode and HTTPS dev servers use a free loopback port instead of the Vite server's listener. Middleware mode has no HTTP server for the relay to share, and the MCP server cannot verify a dev server's self-signed HTTPS certificate.

Existing port settings still work. `devToolsMcpPort` opens a separate socket on the specified port and every interface, without a token; set `FOLDKIT_DEVTOOLS_MCP_PORT` to the same value for the MCP server. `devToolsMcpPort: false` disables the relay. When discovery finds no relay and no port is configured, the MCP server tries port 9988 for older plugin versions. `FOLDKIT_DEVTOOLS_MCP_HOST` overrides the hostname of either a discovered address or a configured port.

The plugin no longer starts a relay during Vitest runs. Previously, a test run using a fixed relay port could conflict with the project's dev server and wait through the four-second bind retry before continuing.

`foldkit/devtools-protocol` now exports `RelayRecord`, `RELAY_RECORD_VERSION`, and the registry directory and environment variable names alongside the `Request` and `Response` frames. The plugin and MCP server use the same record definition. Because the plugin imports these exports at runtime, `@foldkit/vite-plugin` requires `foldkit` 0.163.0 or later. The plugin also depends on `@effect/platform-node` to read and write the registry.

The registry lives under `XDG_RUNTIME_DIR` when set and under the operating system's temporary directory otherwise. `FOLDKIT_DEVTOOLS_RELAY_DIRECTORY` selects another directory. On platforms where the plugin cannot verify directory ownership, including Windows, automatic discovery is unavailable. Use `devToolsMcpPort` with the matching `FOLDKIT_DEVTOOLS_MCP_PORT` there.

`create-foldkit-app` no longer adds `devToolsMcpPort` to generated Vite configs.
