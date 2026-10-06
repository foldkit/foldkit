---
'@foldkit/vite-plugin': patch
---

Apply Foldkit's dependency optimizer and bundling rules in every Vite environment. Before, the plugin excluded `foldkit` from pre-bundling and pre-bundled the Effect entries Foldkit imports only in the client environment, and bundled the Foldkit packages only in the `ssr` environment. A server environment whose optimizer runs dependency discovery, such as every Cloudflare Worker environment whether it is named `ssr` or after the Worker, pre-bundled `foldkit` without the build id transform, so every hydratable render failed with `MissingBuildId`. Applications worked around it with `optimizeDeps.exclude: ['foldkit']`. With that workaround, an application that imports Effect through subpaths still loaded one Effect instance for Foldkit and another for itself. A server environment under another name that did not bundle Foldkit failed with `MissingBuildId` as well.

The plugin now excludes `foldkit` from pre-bundling in every environment, pre-bundles the Effect entries Foldkit imports in every environment whose optimizer is enabled, and bundles the crawled Foldkit packages in every environment through `resolve.noExternal`. Every server environment of the dev server now renders with the same build id as the client and with one Effect instance.

The client environment behaves as before, and so do client and `ssr` builds. Vite's default Node `ssr` environment also behaves as before: its optimizer stays disabled, so Effect still loads from the installed package. A build of a server environment under another name now bundles the Foldkit packages. Before, it externalized them, and the build failed the Foldkit singleton externalization check.

Applications can remove `optimizeDeps.exclude: ['foldkit']` from their Vite config. An application that added a package the crawl misses to `ssr.noExternal` should move it to `resolve.noExternal`. `ssr.noExternal` reaches only the `ssr` environment, so in a server environment under another name that package still loads a second Foldkit copy.
