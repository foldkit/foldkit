---
'@foldkit/devtools-mcp': patch
'@foldkit/oxlint-plugin': patch
'create-foldkit-app': patch
---

The published `foldkit-devtools-mcp` bin and the oxlint plugin's `dist/index.js` are bundled with Rolldown instead of esbuild. Vite 8 already bundles every Foldkit application with Rolldown, and these two were the only package builds still going through esbuild. Each package keeps its bundle recipe in a `rolldown.config.ts` beside the source, and the output is the same shape as before: one ESM file with the same externals and the shebang kept on its first line. The MCP bin no longer carries a `createRequire` banner, since Rolldown's Node platform emits its own shim wherever a CommonJS dependency needs one, and the oxlint plugin's integration tests bundle the plugin and check autofixed sources with Rolldown too, so esbuild leaves both packages' dev dependencies.

Both bundles come out smaller: the MCP bin goes from 1444 kB to 1132 kB (283 kB to 251 kB gzipped) and the oxlint plugin from 499 kB to 455 kB, with build times within noise of esbuild's (median of five clean runs on Apple silicon: 285 ms against 304 ms for the bin, 146 ms against 229 ms for the plugin).

`create-foldkit-app` no longer allows esbuild's install script in the pnpm workspace file it scaffolds, since nothing in a new project installs esbuild.
