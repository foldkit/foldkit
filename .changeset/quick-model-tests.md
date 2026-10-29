---
'foldkit': patch
---

Skip the HMR Model restoration handshake when `setup()` from `foldkit/test/vitest` is active. Runtime startup, including `Runtime.embed`, starts without waiting 500 ms for a Vite plugin response. Setup can be called more than once.
