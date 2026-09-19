---
'@foldkit/vite-plugin': minor
---

A build with `ssr.build` no longer publishes the browser build's unrendered `index.html`. A static host could serve that template as an empty page at `/` with status 200. A host that fell back to `index.html` could serve the same empty page at every missing deep link. The template now stays inside the server bundle's `fetch` handler. The browser output contains `index.html` only when `prerender` generates `/`.

An SSR host obtains documents by calling the server bundle's `fetch` handler. A custom generation loop can call it once per path and write responses that its static host can reproduce. Client-only builds are unchanged: their `index.html` is the page.

The build manifest, its `FoldkitBuildManifest` type, and the plugin's `api` object no longer include `host`. Its only value was `'fetch'`, which the server entry already implements.

**Migration:** Do not expect `dist/client/index.html` in an `ssr.build` output unless `prerender` generated `/`. Stop using that path as an unrendered template or fallback page. An SSR host must send requests that match no static file to `fetch`; a static-only SSG host serves generated files and leaves other paths as misses. Remove reads of `host` from `foldkit.build.json`, `FoldkitBuildManifest`, and the plugin's `api` object. A custom generation loop that read `dist/client/index.html` as its template must request each page through `fetch` instead.
