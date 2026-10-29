---
'@foldkit/vite-plugin': patch
---

Style the first paint of the development document when `ssr.clientEntry` is set. Under `vite dev`, the server-rendered page appeared unstyled until the client script ran, because its CSS was reachable only through the script's imports.

The dev server now inlines each stylesheet the client entry imports statically as a `<style>` element at the end of the head, in the order the browser evaluates those imports, with the configured `html.cspNonce`. Vite's client adopts those elements instead of adding the rules again. Stylesheets behind a dynamic import, and every stylesheet from the first one that cannot be inlined (such as one from a virtual module), apply when the script runs.
