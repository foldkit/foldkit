---
'@foldkit/ui': minor
---

Evict the value from `Slider`. `Slider` stays a Submodel (it keeps the drag interaction state and the pointer/Escape subscriptions), but the current value is now owned by the parent and passed in via `ViewInputs.value`. During a drag the value still lives with the gesture: the drag captures the pre-drag value as its restore point, and `ChangedValue` streams every snapped change to the parent.

- `Slider.Model` drops `value`. It is now `{ id, min, max, step, dragState }`. `min`/`max`/`step` stay because the pointer subscription reads them to map cursor positions into values.
- `Slider.ViewInputs` gains a required `value: number`. The thumb position, `aria-valuenow`, and the filled track derive from it.
- `Slider.init` no longer accepts `initialValue`. The parent initializes its own value field. The new `Slider.snapAndClamp(value, min, max, step)` export conforms a value to the range.
- `fractionOfValue` now takes `(value, min, max)` instead of a Model.
- Value changes surface only as the `ChangedValue` OutMessage; fold it into the parent's value field. `reflectValue` is removed.
- `reflectRange` now updates `min`/`max` only. Because the parent owns the value, conform it to the new range in the same update with `snapAndClamp`.

BREAKING: `reflectValue` and the `Model.value` field are removed, `init` drops `initialValue`, and `fractionOfValue` changes signature. Move the value to a parent Model field: store it, pass it as `value`, fold `ChangedValue` into it, and snap external updates with `snapAndClamp`. Part of #676.
