---
'foldkit': minor
---

Add `Ui.Slider` — a headless numeric range slider for values on a continuous or stepped scale. Follows the WAI-ARIA slider pattern with `role="slider"` on the thumb and keyboard navigation by step (ArrowUp/ArrowDown/ArrowLeft/ArrowRight), larger jumps (PageUp/PageDown), and boundary jumps (Home/End). Pointer drag uses document-level `pointermove` / `pointerup` tracking so the cursor can leave the slider element during a drag; Escape cancels an in-progress drag and restores the pre-drag value.

```ts
Ui.Slider.view({
  model: model.painSlider,
  toParentMessage: message => GotSliderMessage({ message }),
  formatValue: value => `${String(value)} of 10`,
  toView: attributes =>
    div(
      [],
      [
        label([...attributes.label], ['Pain level']),
        div(
          [...attributes.root],
          [
            div([...attributes.track], [div([...attributes.filledTrack], [])]),
            div([...attributes.thumb], []),
          ],
        ),
      ],
    ),
})
```

Notable design choices:

- **Min, max, and step live in the Model.** Stored at init time, the update function can compute the next value on every keyboard / pointer event without accessing config. This also lets the drag subscription translate cursor position into a snapped value in a single place.
- **State is a discriminated union, not a boolean.** `Idle` and `Dragging({ originValue })` replace `isDragging: Boolean` so the pre-drag value is always available for Escape-to-cancel, and the second dispatch produced by event bubbling from thumb → track cannot overwrite it.
- **Fractional steps snap to the step's decimal precision.** A slider with `step: 0.1` produces clean values (0.1, 0.2, 0.3) instead of floating-point drift (0.30000000000000004). Precision is derived from the step literal via `toString()`.
- **Subscriptions are exposed, not hidden.** The consumer wires `Ui.Slider.subscriptions.documentPointer` and `documentEscape` through their own `SubscriptionDeps`, mirroring the approach used by `Ui.DragAndDrop`. This keeps all document-level listeners visible at the top of the program.
- **Accessibility.** Thumb is `role="slider"` with `aria-valuemin` / `aria-valuemax` / `aria-valuenow` / `aria-orientation`. When `formatValue` is provided, the formatted string is announced via `aria-valuetext`. By default the thumb is labeled via `aria-labelledby` pointing at the id carried on the `label` attribute group; consumers can override with explicit `ariaLabel` or `ariaLabelledBy`.
- **OutMessage `ChangedValue`.** Emitted whenever the value actually changes — not on no-op keyboard events at the min/max boundary, and not on `ReleasedDragPointer` (the value was already committed during the drag).

Also extends `OnPointerDown` with `clientX` / `clientY` so click-to-jump on the track can compute a value from the cursor position without re-reading the pointer event from the DOM. The two new parameters are appended after `timeStamp`, so existing 5-argument callers (Menu, Listbox, DragAndDrop, etc.) continue to work unchanged.

Horizontal orientation only in v1; range (two-thumb) sliders and tick marks are planned follow-ups.
