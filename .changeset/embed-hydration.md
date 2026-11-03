---
'foldkit': minor
---

`Runtime.embed` can now adopt a server-rendered root. Pass `isHydratable: true` for a program created by `makeElement`, and the program keeps the container's existing DOM nodes and reconstructs its Model from the Flags payload the server embedded, as `Runtime.hydrate` does for a page-owning application. Before, `embed` always built the container's DOM fresh, so server-rendered markup for an embedded program was thrown away and rebuilt.

On the server, pass `isEmbedded: true` to `renderToString` and set `runtimeId` to the `id` of the container the client gives `makeElement`. The root then carries a `data-foldkit-embed` stamp beside `data-foldkit-app`. A page can hold any number of embedded roots, each with its own Flags payload, beside at most one page-owning application. `Runtime.hydrate` and `makeApplication` ignore embedded roots when they count the page-owning ones, and `injectIntoTemplate` refuses a render made with `isEmbedded`.

A container with no stamp builds fresh from the Flags Effect passed to `embed`, as before. A mismatch heals in place, and the build id check is unchanged: a root from another deployment, a root stamped as page-owning, or a stamp that differs from the container id stops startup and puts the page out of reach. A program created by `makeApplication` cannot adopt a root through `embed`. Use `Runtime.hydrate`.

`embed` without `isHydratable` behaves exactly as it did.
