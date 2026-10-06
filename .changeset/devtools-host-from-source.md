---
'@foldkit/vite-plugin': patch
---

Mount the DevTools overlay in development when Foldkit is installed from the registry. Since 0.25.0, the overlay never appeared in that setup. The plugin pre-bundled `foldkit/devtools-host` while serving `foldkit` itself from source, so the overlay registered with a separate copy of the DevTools config that the runtime never reads.

The plugin no longer declares `foldkit/devtools-host` to the dependency optimizer, so it is served from source with the rest of `foldkit`. It still declares `@foldkit/devtools/vite` when `@foldkit/devtools` is installed from the registry. Applications that added `foldkit/devtools-host` to their own `optimizeDeps.include` as a workaround should remove it. See #1592.
