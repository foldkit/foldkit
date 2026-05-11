---
'foldkit': minor
---

Add a session scrubber to the DevTools panel. In TimeTravel mode, a horizontal slider sits at the bottom of the panel and lets you drag through the message history. Each step replays the host app to that point, so you can watch the UI evolve over the session instead of clicking message rows one at a time. Keyboard navigation works the same as any Foldkit slider (arrows, Page Up/Down, Home, End). The scrubber is hidden in Inspect mode.

The DevTools `mode` config now accepts `{ development, production }` to select different modes per environment. Useful when `show: 'Always'` keeps DevTools available in production but you want `'TimeTravel'` only in local development. `'TimeTravel'` in production pauses the user's actual app when a history row is clicked, so the per-environment form makes shipping the safer `'Inspect'` mode to users opt-in by design.

The Slider component now accepts an optional `getTrackRoot: () => Document | ShadowRoot` in `ViewConfig`, plus a `subscriptionsForRoot(getTrackRoot)` factory next to the existing `subscriptions` value. Both default to `document`. Pass a `ShadowRoot` when rendering the slider inside a shadow tree so pointer events on the track can find their bounding rect.

The Slider's `SubscriptionDeps` fields are renamed from `documentPointer` / `documentEscape` to `dragPointer` / `dragEscape`. The names now describe the activity (drag) rather than the listener attachment point, since the track lookup is configurable per the change above. Update every callsite that references the old names:

```ts
// Before
Slider.SubscriptionDeps.fields['documentPointer']
Slider.SubscriptionDeps.fields['documentEscape']
sliderSubscriptions.documentPointer.modelToDependencies(model)
sliderSubscriptions.documentEscape.dependenciesToStream(...)

// After
Slider.SubscriptionDeps.fields['dragPointer']
Slider.SubscriptionDeps.fields['dragEscape']
sliderSubscriptions.dragPointer.modelToDependencies(model)
sliderSubscriptions.dragEscape.dependenciesToStream(...)
```

Slider also adds `setRange(model, { min, max })` and `setValue(model, value)` helpers for parents that need to sync slider state from external state. Both snap and clamp the resulting value to the new range. `setValue` is a no-op while the user is actively dragging, so external updates don't fight pointer input.
