---
'foldkit': minor
---

Make `Html`, Scene elements, and attributes opaque types. Applications still build, compose, pass, return, and null-check them, but can no longer read or construct the renderer's representation, so the renderer can change without breaking applications. Nothing changes at runtime.

`Html` is now `HtmlNode | null`, where `HtmlNode` is the new opaque type of a rendered element. `createLazy`, `createKeyedLazy`, `Submodel.View`, `defineView`, and `h.submodel` are typed with `Html`. `Attribute<Message>` is now `ElementAttribute<Message> | InnerHtmlAttribute`: every `h.*` attribute constructor and every custom element property and event factory returns one of the two, and a textarea still rejects `h.InnerHTML`. `ChildAttribute` is opaque too. Scene's rendered tree and the elements its queries find are the new opaque `Scene.Element`, which `Scene.find`, `Scene.findAll`, `Scene.textContent`, `Scene.attr`, the Locators, and the Scene matchers take and return.

Scene gains a `toHaveKey(key)` assertion, in `Scene.expect` and in the Vitest matchers. It checks the key the view gave an element through `h.keyed` or `h.Key`.

**Migration:** code that reads node fields such as `sel`, `data`, `children`, `elm`, `key`, or `text`, narrows an attribute by its `_tag`, reads the fields of a `ChildAttribute`, or builds any of these values by hand no longer compiles. In tests, read the rendered tree through Scene queries and matchers, such as `Scene.find`, `Scene.attr`, `Scene.textContent`, `toHaveAttr`, and `toHaveHandler`, and assert keys with `toHaveKey`.
