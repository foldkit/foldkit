---
'foldkit': minor
---

Add `Composition.implement({ ... }).assembleBlock()`. It returns the same completed Block as `Composition.assembleBlock({ ... })` and applies the same checks. The graph check validates local and descendant handlers, the Layer, host handlers, lifecycle registration and requirements. `implement` applies every other assembly check, and `assembleBlock()` applies the graph check through its `this` parameter. Because `assembleBlock()` has one non-generic signature, a file that imports a Block exported this way reads the completed type without repeating the graph check after each edit. The graph check runs when the file that calls `assembleBlock()` is checked.
