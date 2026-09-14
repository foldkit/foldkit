---
'@foldkit/vite-plugin': minor
---

A build with `ssr.build` no longer publishes the browser build's `index.html`. That file is the template the fetch handler renders into, not a page, and left beside the assets it was served as one: an empty container at `/` on a static host, and at every deep link on a host that falls back to `index.html`, all at 200. The template now stays inside the server bundle, and the browser output holds a page at `/` only when the build generated one through `prerender`.

A host obtains a document by rendering, through the bundle's `fetch`. A generation loop of your own over an `ssr.build` output does the same, one `Request` per path. A build without `ssr.build` is unchanged: a client-only application still publishes its `index.html`, because there the file is the page. `foldkit.build.json` no longer carries `host`. Its only value was `'fetch'`, and every host wraps the server entry as a `fetch` handler by definition, so the field said nothing. `FoldkitBuildManifest` drops it; a consumer that read it as optional is unaffected.
