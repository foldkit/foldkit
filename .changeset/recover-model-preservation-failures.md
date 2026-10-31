---
'foldkit': patch
'@foldkit/vite-plugin': patch
---

Recover from development Model preservation failures without throwing from the debounce or reload-flush callback. The live Model and its references remain unchanged. Foldkit warns once while encoding keeps failing, invalidates that runtime's previously preserved entry, and resumes preservation when a later Model encodes successfully.

Opaque DevTools snapshots can contain native Dates, Effect HashMaps, or other non-JSON values. If their Schema cannot encode them, the overlay initializes fresh after reload and reads the active application again. Application values declared through JSON-capable Date and HashMap Schemas round-trip normally.

Update Foldkit and its Vite plugin together. The preservation protocol uses an omitted Model to clear a stale entry, and an older plugin does not understand that invalidation request. Requests that carry a Model, including `null`, keep their meaning.
