# @foldkit/devtools

## 0.116.0

## 0.115.0

## 0.114.1

### Patch Changes

- d2bed68: Fix the submodel message filter dropdown, which rendered incorrectly inside the
  overlay's shadow root: it was invisible, then full-width and mispositioned, then
  layered behind the message list. The panel now anchors below its button at the
  button's width and sits above the overlay.
- 4f637ea: Render the overlay's shared icons (pause, diff dots, filter check, scroll-to-top
  arrow) and the empty-inspector placeholder from plain `VNode` constants again.
  The per-call factory workaround these used is no longer needed now that the
  runtime clones a reused `VNode` before patching, so a shared constant can sit at
  more than one position safely. No visible behavior change.

## 0.114.0

### Patch Changes

- 8f693c6: Cut avoidable per-jump overhead in DevTools time-travel navigation.

  Each navigation used to resolve the model for the target index twice: once in
  `JumpTo` to render the host app, and again in `InspectState` to feed the
  inspector panel. For a mid-segment jump that replayed the segment from the
  nearest keyframe twice. `store.jumpTo` now returns the model it resolved, and a
  single `JumpToAndInspect` command renders the host and builds the inspection
  from that one resolution. Inspect-only navigation (no host pause) still resolves
  once on its own.

  Scrubbing the timeline no longer enqueues a full jump-plus-inspect for every
  `pointermove`. The slider thumb still tracks every move (cheap, model-only), but
  the heavy navigation is coalesced to one per animation frame via a pending-index
  field and an `animationFrame` subscription, so a fast drag can't fall behind the
  cursor.

  DevTools config gains a `keyframeInterval` option (alongside `maxEntries`) to
  trade memory for faster jumps. Smaller intervals store more model snapshots and
  shorten the replay each jump walks, down to `1` where every jump is a
  constant-time snapshot lookup. It is still forced to `1` automatically when
  `excludeFromHistory` is active.

  Also fix the overlay's "Clear history" and "Jump to top" buttons, which
  silently did nothing when clicked.

## 0.113.1

### Patch Changes

- 454dbaa: Render the overlay's pause icon, inline diff dot, and other shared markers from
  zero-arg factories so each tree position gets its own `VNode`. Snabbdom records
  each element's live DOM node by mutating `vnode.elm` in place, so a single
  `VNode` object reused across positions (within a render, or at a different
  position across renders) aliased one `.elm` across multiple DOM nodes. During
  time travel this left the pause icon on previously selected rows and let diff
  dots flicker onto the wrong row. The same shape affected the empty inspector
  placeholder, which a single `VNode` rendered into every (simultaneously
  present) tab panel. The `pauseIconView`, `inlineDiffDotView`, `diffDotView`,
  `checkIconView`, `arrowUpIconView`, and `emptyInspectorView` constants are now
  factories that return a fresh `VNode` per call site.

## 0.113.0

### Minor Changes

- fcc7a94: Bump Effect to `4.0.0-beta.83` (from `4.0.0-beta.78`). Foldkit's peer dependencies now require `effect@4.0.0-beta.83` and `@effect/platform-browser@4.0.0-beta.83`.

  Consumers should align their Effect packages to `4.0.0-beta.83` exactly during the v4 beta window:

  ```bash
  pnpm add effect@4.0.0-beta.83 @effect/platform-browser@4.0.0-beta.83
  pnpm add -D @effect/vitest@4.0.0-beta.83
  ```

### Patch Changes

- 32fd9cb: Drop the unused `@effect/platform-browser` peer dependency from `@foldkit/ui`
  and `@foldkit/devtools`. Neither package imports it, and consumers still
  receive it transitively through `foldkit`, which does use it.

## 0.112.5

## 0.112.4

## 0.112.3

### Patch Changes

- 63c8b51: Author the overlay styles as a committed source module rather than generating
  them from CSS at build time. The compiled output is unchanged.

## 0.112.2

## 0.112.1

## 0.112.0

### Minor Changes

- a481ddb: Split UI components and the in-browser DevTools overlay out of core.

  The 24 UI components move from `foldkit/ui/*` to the new `@foldkit/ui` package, and the DevTools overlay moves to the new `@foldkit/devtools` package. Breaking changes in either no longer force a core version bump.

  Migration:
  - Component usage moves to named imports from the new package: `import { Ui } from 'foldkit'` with `Ui.Button.view(...)` becomes `import { Button } from '@foldkit/ui'` with `Button.view(...)`. The `foldkit/ui/button` subpath becomes `@foldkit/ui/button`. Add `@foldkit/ui` to your dependencies. When a component name collides with another import (for example core's `Calendar`), alias it: `import { Calendar as UiCalendar } from '@foldkit/ui'`.
  - The DevTools overlay is now opt-in. `devTools: true` (or a `devTools` config object) still records history and serves the WebSocket bridge for the DevTools MCP server, but no longer mounts the in-browser panel on its own. To show the panel, install `@foldkit/devtools` and pass its overlay factory:

    ```ts
    import { overlay } from '@foldkit/devtools'

    Runtime.makeApplication({
      // ...
      devTools: { Message, overlay },
    })
    ```

  New public surface on core to support the split: the `foldkit/submodel` subpath, `foldkit/devtools-host` (the instrumentation API the overlay builds on), and `DevToolsOverlay` / `DevToolsPosition` from `foldkit/runtime`.
