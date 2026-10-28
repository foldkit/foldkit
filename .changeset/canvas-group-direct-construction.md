---
'foldkit': minor
---

Make `Canvas.Group` cheap to construct. Calling `Group` used to run the full recursive `Shape` Schema over its children, so every call validated and rebuilt the whole subtree below it. A scene that wraps already-built shapes in nested Groups paid for each shape once per Group above it, on every frame. Calling `Group` now keeps `shapes` and the transform values as given, so the cost of a call no longer depends on the size of its subtree.

In a warmed Node 22.22.3 benchmark on Effect 4.0.0, building a Group of 200 Groups that each wrap 10 prebuilt Rects fell from 1527 µs to 56 µs per scene. Building the same scene including its 2,000 `Rect` calls fell from 2364 µs to 805 µs.

For an object literal, the constructed value is the same as `Group.make` returns: optional fields you leave out stay absent, and extra keys are dropped. The difference is identity. The `shapes` array and the child shapes in it are the ones you passed, not copies. The constructor reads only the input's own properties.

`Group` is otherwise the same recursive Schema. `Schema.decodeUnknownSync(Group)` and `Group.make` validate the whole tree, so decode untrusted shapes through them. `Group` is now also accepted where a Schema without decoding services is required, so `Schema.decodeUnknownSync(Group)` typechecks.

Breaking: the constructor's `shapes` parameter is now typed as `ReadonlyArray<Shape>`. It was `ReadonlyArray<unknown>`, which let a call such as `Group({ shapes: [42] })` compile and then throw at runtime. Since the call no longer validates its children, the type now rejects that call. Calls that pass shapes built with the Canvas constructors are unaffected. Code that passes a `ReadonlyArray<unknown>` needs to type it as `ReadonlyArray<Shape>`, or decode the whole Group through the `Group` Schema instead.
