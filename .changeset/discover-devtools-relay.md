---
'@foldkit/vite-plugin': minor
'@foldkit/devtools-mcp': minor
'create-foldkit-app': patch
---

The DevTools MCP relay no longer needs a port agreed between the Vite config and the MCP server. By default the dev server serves the relay itself, at `/__foldkit/devtools-mcp`, and publishes its address to a per-user registry; `@foldkit/devtools-mcp` looks up the relay of the dev server most recently started for the project it runs in, following it across dev server restarts. There is no second listener, no bind race on restart, and `server.host` decides who can reach the relay the same way it decides who can reach the app. In middleware mode, where no HTTP server can host it, the relay takes a free loopback port instead. `devToolsMcpPort` still opens a socket of its own on a fixed port, on every interface, for an MCP server told the port through `FOLDKIT_DEVTOOLS_MCP_PORT`, and `devToolsMcpPort: false` starts no relay. With nothing published and no port configured, the MCP server falls back to port 9988, so a dev server on an earlier plugin is still reached.

The relay no longer starts when Vite runs in `test` mode, which is how Vitest loads a project's config. A test run had been binding a relay of its own, and with a fixed port it contended with the project's running dev server and held every run for the four second retry window before giving up.

`create-foldkit-app` scaffolds `vite.config.ts` without `devToolsMcpPort`, since the relay is found without one.
