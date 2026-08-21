---
'@foldkit/ui': minor
---

Position an arrow for Popover, so a panel can point at its trigger and keep pointing at it as the panel flips and shifts.

`anchorSetup` takes an `arrowId` and an optional `arrowPadding`. When the id resolves inside the panel's own root, it appends Floating UI's `arrow` middleware and publishes the computed offset as `--arrow-x` and `--arrow-y` on the panel. One axis is set per placement and the other is removed, so a flip cannot leave a stale offset behind. Both are removed on cleanup.

Popover derives the arrow id from its own id, threads it through the anchor Mount, and hands `toView` an `arrow` attribute bundle. Popover does not draw the arrow. Spread the bundle onto your own element inside the panel and write the CSS, which the Popover docs show.

When an arrow resolves, `anchorSetup` no longer writes `overflow-y: auto` and `overscroll-behavior: none` on the panel. A scrolling panel clips on both axes, so it would erase the arrow it just positioned. The `max-height` is still written, so a panel whose content can outgrow the viewport puts the scroll container inside itself. Panels with no arrow are unaffected.

Adding `arrow` to `RenderInfo` is safe for code that destructures the fields it wants in `toView`, and breaking for code that constructs a `RenderInfo` literal, such as a test fixture. Add `arrow: []` there.
