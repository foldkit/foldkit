---
'@foldkit/vite-plugin': patch
---

Bundle installed packages that depend on Foldkit into server builds and the dev server's server render. Since the plugin started bundling `foldkit`, `@foldkit/ui`, and `@foldkit/devtools` into the server artifact, every other installed package that imports Foldkit, such as `@foldkit/markdown` or a component library built on Foldkit, stayed external. Node then loaded a second Foldkit copy from `node_modules` through that package, beside the copy inside the bundle, even when only one copy was installed. A render that sees two Foldkit copies fails.

Server builds and the dev server's server render now also bundle every installed package whose `dependencies` or `peerDependencies` include `foldkit` or an `@foldkit/*` package. In the dev server, these `ssr.noExternal` packages run through Vite's module runner instead of Node's own import. The plugin finds them by crawling from the application's `package.json`: it follows the application's `dependencies` and `devDependencies`, then the `dependencies` of each package it bundles, plus the `devDependencies` of a bundled package that is a private workspace package. An explicit `ssr.external` entry still keeps a package external. A package the crawl does not reach stays external. For example: a peer the application does not declare, or a package reached only through a package that does not depend on Foldkit. Declare such a package in the application's `package.json`, or add it to `ssr.noExternal`.

`resolve.dedupe` now lists `foldkit`, `@foldkit/ui`, and `@foldkit/devtools` only when Vite can resolve them from the application root. Before, a package that Node found only through `NODE_PATH`, which pnpm's `.bin` shims set, could join the list even though Vite's resolver cannot find it there. `NODE_PATH` no longer affects the list. The crawl and this lookup start from the root Vite resolves from: its real path, or the path as given when `resolve.preserveSymlinks` is set.

Vitest copies SSR `noExternal` into `server.deps.inline`. A Vitest config that includes `foldkit()` therefore now also inlines the crawled packages in tests.

`@foldkit/vite-plugin` now depends on `vitefu`, which performs this `package.json` crawl.
