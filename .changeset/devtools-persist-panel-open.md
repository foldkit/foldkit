---
'@foldkit/devtools': minor
---

Persist the DevTools panel's open state across page reloads.

The overlay previously booted closed unconditionally, so every reload
(including every dev-server full reload) meant clicking the badge again to
reopen the panel. The open state now survives reloads: it is read at overlay
boot and written on each badge toggle. Booting with the panel open also
replays the open side effects, locking page scroll when the mobile breakpoint
matches.

DevTools persisted state (panel open and flatten-to-leaf) now lives under a
single `foldkit-devtools` localStorage key, decoded with per-field defaults so
a missing field falls back on its own. The previous `foldkit-devtools-flatten`
key is no longer read, so that toggle resets once.

A first-ever load still starts closed, and storage that is blocked or throws
(for example private browsing) falls back to closed.
