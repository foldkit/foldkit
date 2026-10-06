---
'foldkit': minor
'@foldkit/vite-plugin': minor
'create-foldkit-app': minor
---

Render SSR and SSG documents from server-entry code. An `ssr.build` browser build now starts from a script and never emits an unrendered HTML template. The server entry's `renderDocument` receives the rendered application and the browser build's script, stylesheet, and module-preload URLs. Request-time rendering and prerendering use the same document renderer. `Server.renderDocument` supplies a complete document with application metadata, hydration markers, and unambiguous handoff structure.

**Migration:** add `ssr.clientEntry: '/src/entry.ts'`, import stylesheets from that client entry, and export `renderDocument = Server.renderDocument` from the server entry. Remove the source `index.html` and move additional document tags into a wrapper around `Server.renderDocument(application, assets, { head })`. `head` accepts trusted author-owned HTML, so escape any request-derived values before interpolating them. Remove `containerId` from SSR build and prerender options. Standalone `foldkitBuild` calls must pass `clientEntry` in their options. Build-time `transformIndexHtml` hooks no longer run; dev hooks still transform the rendered document. Use an absolute-path or full-URL Vite `base`; relative bases and relative or runtime `renderBuiltUrl` results are rejected. Upgrade Foldkit alongside the Vite plugin, whose minimum Foldkit version is now 0.166.0.

An SSR build refuses an `index.html` already in the browser output before prerendering, including files copied from `publicDir`, emitted by another plugin, or left by an earlier build with `emptyOutDir` disabled. Remove those root documents so only a generated page can occupy `/`.

Custom template-based hosts can continue using `injectIntoTemplate`, `toResponse`, and `handleRequest` with a template. The template-based Vite dev host remains available when `clientEntry` and `ssr.build` are omitted. Separate client-only builds and previews retain Vite's relative-base behavior. New SSR and SSG scaffolds use code-rendered documents and CSS imports.
