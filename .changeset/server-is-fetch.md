---
'foldkit': minor
'@foldkit/vite-plugin': minor
'create-foldkit-app': minor
---

Make the Foldkit server a Web `fetch` handler.

`ssr.build` no longer takes `entry` pointing at a Node HTTP process or a custom Worker. One `vite build` emits `dist/server/fetch.js` whose default export is `{ fetch }`. Node and Workers both run that module. `handleRequest` in `foldkit/experimental/server` is the shared implementation.

When another plugin owns the `ssr` environment (workerd), Foldkit still stands down in dev. With `ssr.build` set it stays quiet, because production still needs `ssr.serverEntry`.

**Migration:** drop `ssr.build.entry`. Keep `ssr.serverEntry` as `renderPage`. Start the app with `node scripts/serve.mjs` instead of `node dist/server/main.js`. A Cloudflare Worker can default-export the same `fetch.js` module. The handler uses the platform `Request.url` unless `ssr.origin` or `ORIGIN` is set.
