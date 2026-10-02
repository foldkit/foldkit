---
foldkit: minor
'@foldkit/ui': minor
---

`OnKeyDownPreventDefault`, `OnKeyDownSelfPreventDefault`, and `OnKeyDownFocus` leave a keydown alone when its default is already prevented. Foldkit does not call the translator. Before, Escape in an open Menu inside a Popover panel closed the Menu and the Popover together. Now the first Escape closes the Menu and the second closes the Popover. `Scene.keydown` follows the same rule.

The HoverIntent trigger returns `Some` for Escape only while the panel is open. Before, it prevented the default of every Escape, also when it had nothing to close.

**Breaking:** when two of these handlers return `Some` for the same key, only the first one dispatches. This applies to a handler on a descendant and one on its ancestor, and to two attributes on one element, where the earlier attribute runs first. If the second handler must see the key, change it to `OnKeyDown`, which dispatches for every keydown. Its translator returns a Message for every key, not an `Option`. Say a page tracked Escape on a wrapper around a Popover panel:

```ts
// Before: both handlers dispatched for Escape.
h.div(
  [
    h.OnKeyDownPreventDefault(key =>
      key === 'Escape' ? Option.some(Message.PressedEscape()) : Option.none(),
    ),
  ],
  [h.div([...panel])],
)

// After: `OnKeyDown` still dispatches when the panel handled Escape.
h.div([h.OnKeyDown(key => Message.PressedKey({ key }))], [h.div([...panel])])
```
