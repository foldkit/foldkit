---
'foldkit': minor
'@foldkit/vite-plugin': patch
'@foldkit/devtools-mcp': patch
---

The DevTools MCP server and the Vite plugin keep the registry record of a running relay whose dev server runs in another PID namespace, for example a Docker dev container or a coding agent's sandbox. Before, the first MCP tool call from another namespace deleted the record and answered "Not connected to a Foldkit dev server", and the relay stayed undiscoverable until Vite restarted. A dev server starting in another namespace also deleted the records of running dev servers.

On Linux, relay records now carry the PID and network namespaces of the dev server, as the optional `namespaces` field of `RelayRecord`. `RelayNamespaces` is exported from `foldkit/devtools-protocol`. A reader trusts `process.kill(pid, 0)` only when it shares the record's PID namespace, or when neither the reader nor the record has namespaces. Otherwise it removes the record only when the relay's port refuses connections. The MCP server leaves out a relay in another network namespace, because that relay's loopback address is out of its reach, and keeps the record for readers inside that namespace. A record from an older plugin, which carries no namespaces, is removed only when both `process.kill(pid, 0)` and the relay's port show that the relay is gone.

The record format version is unchanged, and older readers ignore the new field. On macOS and Windows, which have no PID namespaces, a record without namespaces is removed when `process.kill(pid, 0)` finds no such process.
