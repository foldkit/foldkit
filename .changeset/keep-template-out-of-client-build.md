---
'@foldkit/vite-plugin': minor
---

A build with `ssr.build` no longer publishes the browser build's `index.html`. That file is the template the fetch handler renders into, with an empty container until a render fills it, and the handler already carries a copy. Left in the browser output it was served as a page: a static host answered `/` with the empty container, and a host that falls back to `index.html` for a request matching no file, such as a single-page-application mode on a CDN, answered every deep link with it, all at 200. Deployment tools had to know to leave that one file out of the upload.

The template is now taken out of the browser bundle before anything is written, and the browser output holds a page at `/` only when the build generated one through `prerender`. The server bundle exports it as `template`, beside the default `{ fetch }` export and the entry's own exports, so a host that renders a page of its own into the shell takes it from the bundle that carries it rather than from a file. Everything else about the build is unchanged: the handler renders into the same template, `prerender` writes the same pages to the same paths, and `foldkit.build.json` still records which paths became files. A host serves the files it finds and calls `fetch` for the rest, which is what the Node reference server did already.

A build without `ssr.build` is not affected: a client-only application still publishes its `index.html`, because there the file is the page.
