---
'@foldkit/devtools-mcp': patch
'@foldkit/vite-plugin': patch
'create-foldkit-app': patch
---

Validate automatically discovered relay URLs before checking liveness, so malformed or unsupported records cannot trigger connection probes. Preserve explicitly configured relay hosts and retain rejected records on disk.

Clarify that disabling HMR prevents server-entry disposal callbacks from running. Restart the dev-server process after editing server modules that own long-lived resources; module reevaluation and an in-process restart cannot release them through an unavailable callback.
