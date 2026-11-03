---
'@foldkit/vite-plugin': patch
---

Automatically register the DevTools overlay in generated production SSR and SSG browser entries before the application entry runs. These builds use the same opt-in as HTML-entry builds: `@foldkit/devtools` must be installed with its Vite integration export and listed in the application's regular dependencies. A development-only dependency remains excluded from production output.

Apps using `ssr.clientEntry` or the standalone `foldkitBuild` plugin no longer need an explicit `virtual:foldkit-devtools-overlay` import or a local declaration for that virtual module. Both plugins resolve the same registration module. Overlay registration stays in the browser build; server rendering and prerendering do not evaluate it.
