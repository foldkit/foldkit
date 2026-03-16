---
'foldkit': minor
---

Replace `slowViewThresholdMs` with `slowView` config object supporting `show`, `thresholdMs`, and `onSlowView`. The `onSlowView` callback receives a `SlowViewContext` with the current model, triggering message, duration, and threshold — replacing the previous `SlowViewInfo` which only had timing data. Rename `VisibilityShow` to `Visibility`. Refactor `DevtoolsConfig` to use `false` instead of `show: 'Never'`, eliminating impossible states.
