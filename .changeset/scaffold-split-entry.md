---
'create-foldkit-app': patch
---

Scaffold projects with a `main.ts` / `entry.ts` split.

`src/main.ts` now holds the pure definitions (Model, Messages, init, update, view). A new `src/entry.ts` imports them and boots the runtime with `Runtime.makeProgram` + `Runtime.run`. `index.html` references `entry.ts`. The split keeps `main.ts` importable from tests without booting a runtime as a side effect, eliminating the runtime-container error noise that appeared in test output when entry files were imported by Vitest.

Existing scaffolded apps are unaffected. The runtime API is unchanged.
