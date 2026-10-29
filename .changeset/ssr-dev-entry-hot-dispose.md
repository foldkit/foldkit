---
'@foldkit/vite-plugin': patch
'create-foldkit-app': patch
---

A server entry can release what it started when the SSR dev server replaces it. Register an `import.meta.hot.dispose` callback in the server entry, and Vite runs it on the old copy before it evaluates the new one:

```ts
const runtime = ManagedRuntime.make(ApplicationLayer)

import.meta.hot?.dispose(() => runtime.dispose())
```

Before, `import.meta.hot` was `undefined` in the server entry, because the dev server loaded it with `server.ssrLoadModule`, whose module runner has HMR turned off. Each edit left the previous copy's `ManagedRuntime`, forked fibers, connections, and timers running until the dev server restarted.

The dev server now loads the entry through the module runner of Vite's `ssr` environment and makes the entry accept its own updates. Other effects in development:

- The new copy is evaluated when the file is saved rather than on the next request. Requests wait while Vite applies the server update. If Vite does not report completion, the wait ends after one second and the request proceeds with the module version Vite has loaded.
- Edits reevaluate the server module graph so a Block Definition in one module is recreated before an edited module declares its handlers. Separate files can define and declare a Block without a false duplicate-registration error after an edit. A genuine duplicate declaration still fails.
- `import.meta.hot` is defined in every module the `ssr` module runner evaluates, so code gated on `import.meta.hot` also runs on the server.
- An `ssr` environment that another plugin backs with its own runtime, such as workerd under a Workers plugin, receives Vite's updates for edits. The `foldkit` plugin's page reload emptied them before.
- Errors thrown while rendering reach Vite's error overlay with stack traces the module runner has already mapped to source.
