# @foldkit/ui

## 0.126.0

### Patch Changes

- 86d0c9f: `Ui.Tooltip` no longer hides when the trigger is pressed. Tooltips hide only on pointer-leave, blur, or Escape. Escape still suppresses re-opening until the user disengages.

  `PressedPointerOnTrigger` now carries only `pointerType`; the `button` field is removed, since it was only used to detect the left-click dismissal that was removed. The message still records the pointer type so the focus that follows a mouse press can be told apart from focus that affirms the tooltip (keyboard, touch, or pen).

## 0.125.0

## 0.124.0

### Minor Changes

- c395720: Add `Ui.Nav`, a stateless, headless primitive for URL-driven navigation. It renders a navigation landmark whose items are links, marking the current destination with `aria-current="page"`, derived from an `isItemCurrent` predicate the consumer drives from the URL. Reach for `Ui.Tabs` instead when switching content within a single page.

## 0.123.0

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

### Minor Changes

- 1a0d7fc: Bring external-label support to the remaining trigger-based `@foldkit/ui`
  components, matching the `Ui.Listbox` trigger.

  `Ui.Combobox`, `Ui.Menu`, `Ui.DatePicker`, `Ui.Popover`, `Ui.Tooltip`, and
  `Ui.Disclosure` now accept optional `ariaLabel` and `ariaLabelledBy` on their
  view inputs. When provided, they are applied to the component's trigger
  element (the input for Combobox, the button for the rest), with `ariaLabel`
  taking precedence. Neither attribute is emitted when omitted, so a trigger
  never carries a dangling `aria-labelledby`.

  Each component also exposes a bare-id helper that mirrors its internal id
  convention, so a native `<label for=...>` can target the trigger without
  hardcoding the suffix: `Combobox.inputId(id)` (and `Combobox.Multi.inputId(id)`),
  `Menu.buttonId(id)`, `DatePicker.triggerId(id)`, `Popover.buttonId(id)`,
  `Tooltip.triggerId(id)`, and `Disclosure.buttonId(id)`.

### Patch Changes

- f3dee68: Clarify the Dialog docstrings about how the native `<dialog>` is opened. The
  `ShowDialog` command and the component view go through `Dom.showDialog`, which
  calls `show()` rather than native `showModal()` so other high-z-index overlays
  stay interactive. The docs now describe the high z-index, focus trap,
  component-supplied backdrop, and `cancel` event on Esc instead of implying
  native modal semantics.

## 0.120.0

### Minor Changes

- d17a0e5: Add a first-class way to associate an external label with the `Ui.Listbox`
  trigger button.

  `ViewInputs` now accepts optional `ariaLabel` and `ariaLabelledBy`. When
  provided, they are applied to the trigger button, with `ariaLabel` taking
  precedence. Neither attribute is rendered when omitted, so the trigger never
  carries a dangling `aria-labelledby`. `Listbox.buttonId(id)` (and
  `Listbox.Multi.buttonId(id)`) returns the bare id of the trigger button,
  mirroring the existing `buttonSelector`, so a native
  `<label for={Listbox.buttonId(id)}>` can drive click-to-focus without
  hardcoding the internal `-button` convention.

- 4405bd2: Rename `Dom.showModal` to `Dom.showDialog` and `Dom.closeModal` to
  `Dom.closeDialog`.

  The old names implied native `HTMLDialogElement.showModal()` semantics, but
  `Dom.showModal` deliberately calls `element.show()` plus a manual focus trap
  and a high z-index so DevTools and other overlays stay interactive above the
  dialog. `Dom.closeModal` wraps native `.close()`. The new names drop the
  misnomer and match the already-`Dialog`-flavored internals and the `Ui.Dialog`
  Commands.

  Migration: rename `Dom.showModal` to `Dom.showDialog` and `Dom.closeModal` to
  `Dom.closeDialog` at every call site. Behavior is unchanged.

## 0.119.0

### Minor Changes

- c1a545c: Add `h.OnUnmount(message)` and auto-release `Ui.Dialog` resources when the
  dialog element unmounts.

  `h.OnUnmount(message)` is a new Html attribute that dispatches a Message when
  its element is removed from the DOM by a structural patch (a key change, a
  parent re-render that drops it, route navigation away from its subtree). It
  binds to snabbdom's `destroy` hook, so the resulting Message flows through
  `update` like any other fact. When the element belongs to a Submodel, the
  boundary wrapping chain is resolved eagerly at render time, so the Message
  still reaches the parent even though the Submodel boundary is torn down in the
  same patch. It is replay-safe: the runtime suppresses the dispatch during a
  DevTools time-travel render, so scrubbing through history never re-runs the
  cleanup.

  `Ui.Dialog` uses this as a backstop. Previously, unmounting an open dialog
  without a purposeful close (the classic case being navigation away from a
  route-keyed subtree that contains it) left page scroll locked and the
  focus-trap keyboard listener installed, and could leave the Model reading a
  stale `isOpen: true`. The dialog now emits `Unmounted` on structural unmount,
  which resets the Model to a clean closed state and runs a hygiene-only
  `ReleaseDialogResources` Command (release scroll lock, restore focus, remove
  the keydown listener). The view only attaches the backstop while the dialog is
  visible (open or mid-leave), so navigating a page full of closed dialogs does
  not flood the message log. This backstop is silent: it does not emit the
  `Closed` OutMessage, run consumer close Commands, or play a leave animation. The
  purposeful close path (Escape, backdrop, close button) is unchanged. The
  cleanup is idempotent and releases the shared scroll lock exactly once, so a
  normal close followed by an unmount never double-releases.

  A new `Dom.releaseDialogResources(id)` Effect performs the idempotent,
  hygiene-only release and is exported from `foldkit/dom`. It is addressed by the
  dialog's id, not a selector, because the element is typically already gone from
  the DOM by the time the backstop runs. Because this cleanup is now keyed by id
  rather than by element, a dialog's id must be non-empty and unique within the
  document.

- 1a0a454: Add `animatePanel` to the `Ui.Disclosure` attribute bundle, so disclosures can
  animate their expand and collapse. It wraps panel content in a CSS-grid
  container that transitions height (`grid-template-rows: 0fr → 1fr` with
  `overflow: hidden`), keeping the panel mounted while collapsed so the transition
  has something to animate from and to. Render the panel unconditionally and pass
  it through `attributes.animatePanel` instead of gating it on `isOpen`. The
  collapsed content is marked `aria-hidden`. Mirrors the `Ui.Animation`
  `animateSize` flag.

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

- d2bed68: Make anchored overlays (Listbox, Menu, Combobox, Popover) work when the app is
  mounted inside a shadow root, such as the DevTools overlay. The panel portals
  into the element's containing root instead of always `document.body` (keeping its
  scoped styles), resolves its anchor button and focus target within that root
  (`document.getElementById`/`querySelector` do not pierce shadow boundaries), and
  positions with Floating UI's `fixed` strategy in a shadow context (the `absolute`
  strategy mismeasures against the shadow host as `offsetParent`). Light-DOM apps
  are unchanged.

## 0.114.0

## 0.113.1

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

### Patch Changes

- 1684a0c: Escape element ids before using them as CSS selectors. Components that focus or
  observe their own elements (Listbox, Combobox, Menu, Popover, Dialog, DatePicker,
  Calendar, RadioGroup, Tabs, Disclosure, and animated overlays) built selectors as
  `#${id}`, which threw a `querySelector` SyntaxError when the id was not a valid CSS
  identifier on its own. Ids beginning with a digit, such as UUID-prefixed ids, now
  work.

## 0.112.4

## 0.112.3

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
