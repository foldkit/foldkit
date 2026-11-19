---
'@foldkit/vite-plugin': patch
---

Style the first paint of the development document when `ssr.clientEntry` is set. Under `vite dev`, the server-rendered page appeared unstyled until the client script ran, because its CSS was reachable only through the script's imports.

The dev server now links each stylesheet the client entry imports statically at the end of the head, where `renderDocument` puts production stylesheets, in the order the browser evaluates those imports. Tags that other plugins append to the head through `transformIndexHtml` follow the links, as they follow the production stylesheets, so a cascade layer order declared in an imported stylesheet matches production. Vite's client adopts the links instead of adding the rules again. Stylesheets behind a dynamic import, and every stylesheet from the first one Vite's client cannot adopt (such as one from a virtual module), apply when the script runs.
