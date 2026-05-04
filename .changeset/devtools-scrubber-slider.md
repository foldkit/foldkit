---
'foldkit': minor
---

Add a session scrubber to the DevTools panel. In TimeTravel mode, a horizontal slider sits at the bottom of the panel and lets you drag through the message history. Each step replays the host app to that point, so you can watch the UI evolve over the session instead of clicking message rows one at a time. Keyboard navigation works the same as any Foldkit slider (arrows, Page Up/Down, Home, End). The scrubber is hidden in Inspect mode and when the history is empty.

The Slider component now accepts an optional `getTrackRoot: () => Document | ShadowRoot` in `ViewConfig`, plus a `subscriptionsForRoot(getTrackRoot)` factory next to the existing `subscriptions` value. Both default to `document`. Pass a `ShadowRoot` when rendering the slider inside a shadow tree so pointer events on the track can find their bounding rect. Existing slider consumers need no changes.
