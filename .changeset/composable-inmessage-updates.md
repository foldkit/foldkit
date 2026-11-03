---
'foldkit': minor
'@foldkit/ui': minor
'@foldkit/oxlint-plugin': patch
'create-foldkit-app': patch
---

Rename parent input handling to `inMessageUpdate` and give it the same checked composition helpers as local updates. Use `Composition.makeInMessageUpdate` instead of `makeReceive`, return `inMessageUpdate` from the Block constructor, and rename feature-local `receive.ts` modules to `inMessageUpdate.ts`.

Keep an exhaustive input handler record as the default. Additional `cases`, `each`, `on`, `except`, and `compose` pieces select InMessage tags, preserve the original `before` Model across grouping, and retain exact output channels and registered child operations. Commands still produce ordinary local Messages. Compatible Model-only Steps can be shared by both entry points without merging their input unions.

Generated Binding methods keep their existing names and synchronous behavior. Acquired executables expose direct and curried `inMessageUpdate` calls. The old `receive` field and `makeReceive` builder are removed without aliases. Update UI implementation consumers and lint recognition, scaffold guidance, and active documentation to use the new names.
