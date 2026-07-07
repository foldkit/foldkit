# @foldkit/devtools

## 0.126.0

## 0.125.0

### Minor Changes

- 595a641: Persist the DevTools panel's open state across page reloads.

  The overlay previously booted closed unconditionally, so every reload
  (including every dev-server full reload) meant clicking the badge again to
  reopen the panel. The open state now survives reloads: it is read at overlay
  boot and written on each badge toggle. Booting with the panel open also
  replays the open side effects, locking page scroll when the mobile breakpoint
  matches.

  DevTools persisted state (panel open and flatten-to-leaf) now lives under a
  single `foldkit-devtools` localStorage key, decoded with per-field defaults so
  a missing field falls back on its own. The previous `foldkit-devtools-flatten`
  key is no longer read, so that toggle resets once.

  A first-ever load still starts closed, and storage that is blocked or throws
  (for example private browsing) falls back to closed.

## 0.124.0

## 0.123.0

### Minor Changes

- ce2a1c4: Add a Settings screen to the overlay, opened from a gear button in the new panel footer. The first setting, "Flatten to leaf Message", labels each Message list row with its innermost Message and unwraps the inspected Message to the leaf. The preference persists in localStorage.

## 0.122.1

### Patch Changes

- ca64832: Typecheck test files. Each package's `typecheck` script now checks the project that includes tests instead of the build project that excludes them. No runtime changes.

## 0.122.0

### Minor Changes

- 0460a48: Hand the Dialog's title and description ids to the consumer through `RenderInfo`
  so they are never hand-rolled.

  `RenderInfo` gains `title` and `description` attribute groups (siblings of
  `dialog` / `backdrop` / `panel` / `closeButton`). Spread them onto your heading
  and description elements:

  ```ts
  toView: ({ dialog, backdrop, panel, title, description, closeButton }) => ...
  h.h2([...title], ['My dialog'])
  h.p([...description], ['...'])
  ```

  The dialog's own `aria-labelledby` / `aria-describedby` point at the same
  framework-managed ids, so labelling wires up without the consumer constructing
  any id. This removes the class of bug where a consumer independently built a
  dialog-scoped id such as `${dialogId}-title` for a form field literally called
  "title" and silently collided with the dialog's own heading id.

  Migration: destructure `title` / `description` from the `toView` render info and
  spread them, instead of `h.Id(Dialog.titleId(model))` / `descriptionId`. The
  `Dialog.titleId` / `Dialog.descriptionId` helpers remain as an escape hatch for
  referencing the id as a value outside `toView` (a Command calling
  `getElementById`, a cross-element reference, or a test).

  Defense in depth alongside the `RenderInfo` change:

  - The reserved ids are namespaced. The helpers and rendered ids now use the
    `-dialog-title` / `-dialog-description` suffixes rather than the bare `-title`
    / `-description`, so even a hand-rolled id is far less likely to collide.
  - The runtime gains a development-only diagnostic: it scans the
    Foldkit-rendered root for elements sharing an `id` and emits a
    `[foldkit]`-prefixed `console.warn` naming the duplicated id. The scan is
    coalesced on a trailing timer so rapid successive renders trigger at most one
    full-tree scan per second, warns once per id, is scoped to the app root, never
    throws, and is tree-shaken out of production builds.

## 0.121.0

## 0.120.0

## 0.119.0

## 0.118.0

## 0.117.0

### Minor Changes

- 1795e0e: Bump Effect to `4.0.0-beta.88` (from `4.0.0-beta.83`). Foldkit's peer dependencies now require `effect@4.0.0-beta.88` and `@effect/platform-browser@4.0.0-beta.88`.

  Consumers should align their Effect packages to `4.0.0-beta.88` exactly during the v4 beta window:

  ```bash
  pnpm add effect@4.0.0-beta.88 @effect/platform-browser@4.0.0-beta.88
  pnpm add -D @effect/vitest@4.0.0-beta.88
  ```

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
