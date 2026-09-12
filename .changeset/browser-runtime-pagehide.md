---
'foldkit': minor
---

Run page-owning applications with Effect's `BrowserRuntime` again now that it interrupts on a non-persisted `pagehide` instead of `beforeunload`.

Real page discards once again get best-effort runtime finalization, while downloads, cancelled navigations, and back/forward cache restores leave the application alive. `foldkit` once again requires `@effect/platform-browser@4.0.0-rc.115` as a peer dependency; install it alongside `effect@4.0.0-rc.115`.
