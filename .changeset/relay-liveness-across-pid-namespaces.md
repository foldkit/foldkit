---
'foldkit': minor
'@foldkit/vite-plugin': patch
'@foldkit/devtools-mcp': patch
---

The DevTools MCP server and Vite plugin keep relay records when the publishing dev server runs in another PID namespace, such as a Docker dev container or a coding agent's sandbox. Before, the first MCP tool call from another namespace could delete a live record, leaving the relay undiscoverable until Vite restarted. A dev server publishing from another namespace could also delete other live records.

On Linux, relay records now carry the PID and network namespaces of the publishing process as the optional `namespaces` field. `RelayNamespaces` is exported from `foldkit/devtools-protocol`. Matching PID namespaces allow the ordinary process check. When the PID namespace is different or unknown, a failed process check does not prove the relay is gone; the reader retires its record only when the port refuses connections. A reader in a known different network namespace omits the unreachable relay without deleting its record. Records without namespace identifiers use ordinary PID checks on non-Linux hosts. Older readers ignore the additional field, and the record version stays unchanged.
