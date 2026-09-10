---
'foldkit': minor
'@foldkit/vite-plugin': minor
'@foldkit/devtools-mcp': minor
'create-foldkit-app': patch
---

The DevTools MCP relay no longer needs a port agreed between the Vite config and the MCP server. Without `devToolsMcpPort`, the dev server now serves the relay itself, at `/__foldkit/devtools-mcp`, and publishes its address to a per-user registry, where before nothing started. `@foldkit/devtools-mcp` looks up the relay of the dev server most recently started for the project it runs in and follows it across dev server restarts. There is no second listener, no bind race on restart, and `server.host` decides who can reach the relay the same way it decides who can reach the app.

Two cases take a free loopback port of their own instead: middleware mode, where no HTTP server can host the relay, and an HTTPS dev server, whose self-signed certificate the MCP server could not verify. The published address carries a random token and the relay refuses a connection without it, so a dev server on `--host` does not expose Model inspection or Message dispatch to the network.

`devToolsMcpPort` keeps its meaning: a socket of its own on a fixed port, on every interface, without a token, for an MCP server told the port through `FOLDKIT_DEVTOOLS_MCP_PORT`. `devToolsMcpPort: false` starts no relay. With nothing published and no port configured, the MCP server falls back to port 9988, so a dev server on an earlier plugin is still reached. `FOLDKIT_DEVTOOLS_MCP_HOST` replaces the hostname of a discovered address as well as of a configured port.

The relay no longer starts under Vitest, recognized by the `test` mode it loads a config in or by its own plugins when a run is given another mode. A test run had been binding a relay of its own, and with a fixed port it contended with the project's running dev server and held every run for the four second retry window before giving up.

The record a dev server publishes is `RelayRecord`, exported from `foldkit/devtools-protocol` beside the `Request` and `Response` frames, with `RELAY_RECORD_VERSION`, the registry directory name and the name of `FOLDKIT_DEVTOOLS_RELAY_DIRECTORY`, so the plugin and the MCP server share one definition of the record. `@foldkit/vite-plugin` imports them at runtime and therefore requires `foldkit` 0.163.0 or later. The registry lives under `XDG_RUNTIME_DIR` when that is set and under the operating system's temporary directory otherwise, unless `FOLDKIT_DEVTOOLS_RELAY_DIRECTORY` names another directory. The record carries the relay's token, so the plugin refuses to publish into a directory that belongs to another user or that other users can read, and says so on the console; the relay still listens, and a configured `devToolsMcpPort` reaches it.

The registry is read and written through Effect's platform services, so `@foldkit/vite-plugin` now depends on `@effect/platform-node`; nothing changes for an application, which installs it with the plugin.

`create-foldkit-app` scaffolds `vite.config.ts` without `devToolsMcpPort`, since the relay is found without one.
