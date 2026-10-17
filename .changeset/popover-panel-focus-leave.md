---
'@foldkit/ui': patch
---

A default Popover stays open when focus moves from the panel into a control inside it. Tab can reach that control. The panel still closes when focus leaves it. `contentFocus: true` is unchanged: the panel is not focusable and does not close when focus leaves.

Clicking the DevTools overlay closes a default Popover. The panel used to stay open while you inspected the Model.

A Scene test that calls `Scene.blur` on the panel throws, because the panel has no blur handler. Call `Scene.focusLeave` instead.
