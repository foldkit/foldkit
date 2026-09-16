---
'@foldkit/vite-plugin': minor
---

A build with `ssr.build` no longer publishes the browser build's `index.html`. That file is the template the fetch handler renders into, not a page, and left beside the assets it was served as one: an empty container at `/` on a static host, and at every deep link on a host that falls back to `index.html`, all at 200. The template now stays inside the server bundle, and the browser output holds a page at `/` only when the build generated one through `prerender`.

A host obtains a document by rendering, through the bundle's `fetch`. A generation loop of your own over an `ssr.build` output does the same, one `Request` per path. A build without `ssr.build` is unchanged: a client-only application still publishes its `index.html`, because there the file is the page. `foldkit.build.json` no longer carries `host`. Its only value was `'fetch'`, and every host wraps the server entry as a `fetch` handler by definition, so the field said nothing. `FoldkitBuildManifest` drops it.

**Migration:** `dist/client/index.html` no longer exists for a build with `ssr.build`. A deploy step that copies, previews, or serves that file as a page has to stop, and a host that fell back to it for a request matching no file has to send that request to `fetch` instead; a request for `/` is a file only when `prerender` generated one. A consumer that read `host` from `foldkit.build.json`, or from the `FoldkitBuildManifest` type, drops the read; the handler is always a `fetch` handler. A generation loop that read `dist/client/index.html` as its template renders through `fetch` instead, one `Request` per path.
