---
'@foldkit/vite-plugin': minor
'@foldkit/oxlint-plugin': minor
---

Automatic branch identity for conditional view arms.

The Vite plugin now injects a call-site key onto every conditional view arm that constructs its element directly: ternary arms, if/else returns, Match arms, Option.match and Array.match handlers, and inline conditional inserts. Positions that previously patched in place across branches now replace, so DOM state (focus, scroll, uncontrolled input values, an open details) no longer bleeds across a logical identity change. Explicit `h.Key` and `h.keyed` always win over an injected key, mapped list rows are never touched, and arms that delegate to another view function are left alone. Builds without the plugin keep the old semantics, where unkeyed branches patch in place. `foldkit()` now returns an array of plugins; `plugins: [foldkit()]` keeps working unchanged because Vite flattens nested plugin arrays.

The oxlint plugin adds `keyed-required-for-delegated-arms`, which flags conditional Html positions whose arms are delegated view function calls with no key at the branch site. Those arms are the one branching shape the build transform cannot reach, so they still need a manual `keyed` wrapper with a discriminating key.
