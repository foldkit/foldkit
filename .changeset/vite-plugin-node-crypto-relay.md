---
'@foldkit/vite-plugin': patch
---

The plugin loads on Effect 4.1.0. It imported `Crypto` from the `effect` root to generate the DevTools MCP relay id and token, and Effect 4.1.0 moved that module to `effect/crypto`, so Vite stopped with `The requested module 'effect' does not provide an export named 'Crypto'` while loading any config that used the plugin.

The relay id now comes from `randomUUID` and the relay token from `randomBytes(32)`, both from `node:crypto`, which the plugin already uses for the relay challenge proofs. The plugin runs only in Node, so it no longer needs a platform `Crypto` service or `NodeCrypto.layer`. The id and token have the same format as before: a UUID v4 and 64 hexadecimal characters. The `effect` peer dependency stays at `4.0.0`.
