---
'foldkit': patch
---

Fix HMR cold-start spurious "no plugin response" warning. On a fresh page load, `@foldkit/vite-plugin` sends `foldkit:restore-model { id, model: undefined }` to mean "no preserved model." Vite serializes the WS payload via `JSON.stringify`, which drops keys whose value is `undefined`, so the wire became `{"id":"app"}`. The runtime's `RestoreModelMessage` schema declared `model` as a required `Schema.Unknown`, the decode failed, the failure was swallowed, and the runtime hit the 500ms timeout, printing a misleading warning that the plugin wasn't installed. `RestoreModelMessage.model` is now `Schema.optional(Schema.Unknown)`, so the absent key round-trips cleanly.

Also corrects the warning text itself. When the plugin really is missing, it now references the correct package (`@foldkit/vite-plugin`) and named import (`import { foldkit } from '@foldkit/vite-plugin'`).
