---
'foldkit': patch
'@foldkit/vite-plugin': patch
---

Recover from development Model preservation failures without throwing from the debounce or reload-flush callback. The live Model and its references remain unchanged. Warn once while encoding continues to fail, invalidate that runtime's previous preserved entry, and resume preservation when a later Model encodes successfully.

Opaque DevTools snapshots can contain native Dates, Effect HashMaps, or other non-JSON values. If their Schema cannot encode them, the overlay initializes fresh after reload and reads the active application again. Application values declared through JSON-capable Date and HashMap Schemas continue to round-trip normally.

Update Foldkit and its Vite plugin together. The coherent preview's preservation protocol now uses an omitted Model to clear a stale entry; existing Model-present traffic, including null, retains its meaning. An older plugin does not understand that invalidation request. No public Block authoring API or preservation scheduling changes.
