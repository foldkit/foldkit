---
'foldkit': minor
---

Replace `Task` with `Dom` and `Render`.

The `Task` namespace mixed DOM operations, render-timing primitives, time helpers, and trivial Effect wrappers under one umbrella. It now splits into two narrower namespaces, with the trivial wrappers dropped.

`Dom` covers element-targeted side effects: `focus`, `showModal`, `closeModal`, `clickElement`, `scrollIntoView`, `advanceFocus`, `lockScroll`, `unlockScroll`, `inertOthers`, `restoreInert`, `detectElementMovement`, `waitForAnimationSettled`. Each helper still gates itself on the next render commit, so call sites do not change shape. Import from `foldkit/dom` or pull `Dom` from the root barrel: `import { Dom } from 'foldkit'`.

`Render` covers render-cycle synchronization: `Render.afterCommit` (one `requestAnimationFrame`, resumes once the latest model has been patched into the DOM) and `Render.afterPaint` (two `requestAnimationFrame`s, resumes once the prior state has been displayed). Use `afterCommit` before any DOM read or write whose target was just brought into existence by a Message. Use `afterPaint` for CSS transition orchestration. Import from `foldkit/render` or pull `Render` from the root barrel: `import { Render } from 'foldkit'`.

Dropped: `Task.delay`, `Task.getTime`, `Task.getTimeZone`, `Task.getZonedTime`, `Task.getZonedTimeIn`, `Task.uuid`, `Task.randomInt`, and `TimeZoneError`. The dropped helpers were thin wrappers around APIs Effect already exposes; reach for those APIs directly.

Migration:

- `Task.focus(...)` → `Dom.focus(...)` (and similarly for every other DOM helper).
- `Task.afterRender` → `Render.afterCommit`.
- `Task.nextFrame` → `Render.afterPaint`.
- `Task.delay(duration)` → `Effect.sleep(duration)`. Same `Duration.Input` shape (string like `'1 second'`, milliseconds number, or `Duration` value).
- `Task.getTime` → `DateTime.now`. It's an `Effect<DateTime.Utc>`, so yield it or compose it the same way you used `Task.getTime`.
- `Task.getZonedTime` → `DateTime.now.pipe(Effect.map(utc => DateTime.setZone(utc, DateTime.zoneMakeLocal())))`.
- `Task.getZonedTimeIn(zoneId)` → use `DateTime.zoneMakeNamed(zoneId)` (returns `Option<TimeZone>`) and convert the `None` case into a domain error in your app if you need the typed-error story.
- `Task.uuid` → `Random.nextUUIDv4`. An `Effect<string>` that pulls from Effect's `Random` service (seedable in tests, runtime-agnostic).
- `Task.randomInt(min, max)` → `Random.nextIntBetween(min, max, { halfOpen: true })`. The `halfOpen` option is required under Effect v4 to keep `max` exclusive; without it, `max` is inclusive.
