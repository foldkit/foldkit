---
'foldkit': minor
'@foldkit/vite-plugin': minor
'create-foldkit-app': minor
---

Make the Foldkit server a Web `fetch` handler.

`ssr.build` no longer takes `entry` pointing at a Node HTTP process or a custom Worker. One `vite build` emits `dist/server/fetch.js` whose default export is `{ fetch }`. Node and Workers both run that module. `handleRequest` in `foldkit/experimental/server` is the shared implementation.

When another plugin owns the `ssr` environment (workerd), Foldkit still stands down in dev. With `ssr.build` set it stays quiet, because production still needs `ssr.serverEntry`.

**Migration:** drop `ssr.build.entry` and keep `ssr.serverEntry`. Your Node host is no longer built by `vite build`. Replace it with a script that serves `dist/client` and falls through to `dist/server/fetch.js`, using the SSR example's `scripts/serve.ts` as the reference, and start with `node scripts/serve.ts` instead of `node dist/server/main.js`. A host that imported `dist/server/entry.server.js` now imports `dist/server/fetch.js`, which still exports `renderPage`. A Cloudflare Worker can default-export `fetch.js` directly. `foldkit.build.json` records `fetch.js` as `serverEntry`. The handler trusts `Request.url` as the platform constructed it; a Node adapter resolves the raw request target against its configured origin before calling `fetch`, as `scripts/serve.ts` does.
