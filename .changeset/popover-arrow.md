---
'@foldkit/ui': minor
---

Popover can now draw an arrow that tracks the trigger. `anchorSetup` takes an `arrowId` and an optional `arrowPadding`, appends Floating UI's `arrow` middleware when the id resolves inside the panel's own root, and publishes the computed offset as `--arrow-x` and `--arrow-y` on the panel. One axis is set per placement and the other is removed, so a flip cannot leave a stale offset behind. Both are removed on cleanup. Popover derives the id from its own, threads it through the anchor Mount, and hands `toView` an `arrow` attribute bundle. It still does not draw the arrow: spread the bundle onto your element and write the CSS, which the Popover docs show.

Adding `arrow` to `RenderInfo` is safe for code that destructures the fields it wants in `toView`, and breaking for code that constructs a `RenderInfo` literal, such as a test fixture. Add `arrow: []` there.

One thing learned when unconditional `data-placement` landed: making a positioning signal newly available can wake dormant CSS. If you already ship per-side rules written against a world without these hooks, check panels that never opted in.
