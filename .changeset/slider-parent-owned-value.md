---
'@foldkit/ui': minor
---

Breaking: Slider no longer stores its value. The parent Model owns the value, passes it in per render via `ViewInputs.value`, and folds the `ChangedValue` OutMessage back into its own state. The component keeps only private interaction state (`min`/`max`/`step` configuration and the drag phase), so the value cannot drift from parent truth. `InitConfig` drops `initialValue`; seed the parent-owned field instead, conforming it with the newly exported `snapAndClamp(value, min, max, step)`. `reflectValue` is removed; update the parent-owned field directly. `fractionOfValue` now takes `(value, min, max)` instead of a Model. `reflectRange` still reflects an externally-driven range onto the component but no longer clamps a stored value; clamp the parent-owned value with `snapAndClamp` in the same update. Part of #676.

### Migration

Add a field for the value to your Model and seed it in init:

```ts
// Before
const Model = S.Struct({
  volumeSlider: Slider.Model,
})

const init = () => ({
  volumeSlider: Slider.init({
    id: 'volume',
    min: 0,
    max: 1,
    step: 0.05,
    initialValue: 0.5,
  }),
})
```

```ts
// After
const Model = S.Struct({
  volumeSlider: Slider.Model,
  volume: S.Number,
})

const init = () => ({
  volumeSlider: Slider.init({ id: 'volume', min: 0, max: 1, step: 0.05 }),
  volume: Slider.snapAndClamp(0.5, 0, 1, 0.05),
})
```

In update, fold the `ChangedValue` OutMessage into the parent-owned field:

```ts
GotVolumeSliderMessage: ({ message }) => {
  const [nextVolumeSlider, sliderCommands, maybeOutMessage] = Slider.update(
    model.volumeSlider,
    message,
  )

  const nextVolume = Option.match(maybeOutMessage, {
    onNone: () => model.volume,
    onSome: M.type<Slider.OutMessage>().pipe(
      M.tagsExhaustive({
        ChangedValue: ({ value }) => value,
      }),
    ),
  })

  return [
    evo(model, {
      volumeSlider: () => nextVolumeSlider,
      volume: () => nextVolume,
    }),
    Command.mapMessages(sliderCommands, message =>
      GotVolumeSliderMessage({ message }),
    ),
  ]
}
```

In view, pass the parent-owned value back in:

```ts
h.submodel({
  slotId: model.volumeSlider.id,
  model: model.volumeSlider,
  view: Slider.view,
  viewInputs: {
    value: model.volume,
    ariaLabel: 'Volume',
    toView,
  },
  toParentMessage: message => GotVolumeSliderMessage({ message }),
})
```
